import Stripe from "stripe";
import { billingFromStripeDetails } from "@/features/payments/domain/billing";
import type { PaymentAdapter, PaymentWebhookEvent } from "../types";

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Firma webhook non valida");
    this.name = "InvalidWebhookSignatureError";
  }
}

export function createStripePaymentAdapter(config?: {
  secretKey?: string;
  webhookSecret?: string;
}): PaymentAdapter {
  const secretKey = config?.secretKey ?? process.env.STRIPE_SECRET_KEY;
  const webhookSecret = config?.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error("Stripe non configurato");
  }
  const stripe = new Stripe(secretKey);

  return {
    async createCheckout(input) {
      const email = input.customer?.email?.trim() || null;
      const name = input.customer?.name?.trim() || null;
      let customerId = input.customer?.stripeCustomerId?.trim() || null;
      if (customerId && (email || name)) {
        try {
          await stripe.customers.update(customerId, {
            ...(email ? { email } : {}),
            ...(name ? { name } : {}),
          });
        } catch {
          customerId = null;
        }
      }
      if (!customerId && (email || name)) {
        try {
          const customer = await stripe.customers.create({
            ...(email ? { email } : {}),
            ...(name ? { name } : {}),
            metadata: { paymentId: input.reference },
          });
          customerId = customer.id;
        } catch {
          customerId = null;
        }
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: input.reference,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        billing_address_collection: "required",
        metadata: { paymentId: input.reference },
        ...(customerId
          ? { customer: customerId, customer_update: { address: "auto", name: "auto" } }
          : email
            ? { customer_email: email }
            : {}),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              product_data: { name: "Quota iscrizione" },
            },
          },
        ],
      });
      if (!session.url) {
        throw new Error("Checkout Stripe senza URL");
      }
      return { providerRef: session.id, redirectUrl: session.url, stripeCustomerId: customerId };
    },
    async parseWebhook(input) {
      const signature = input.headers.get("stripe-signature");
      if (!signature) {
        throw new InvalidWebhookSignatureError();
      }
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(input.rawBody, signature, webhookSecret);
      } catch {
        throw new InvalidWebhookSignatureError();
      }
      return mapStripeEvent(event);
    },
  };
}

function mapCheckoutSession(event: Stripe.Event, session: Stripe.Checkout.Session): PaymentWebhookEvent {
  const paymentId = session.metadata?.paymentId ?? session.client_reference_id ?? undefined;
  const providerPaymentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.id;
  const paid = session.payment_status === "paid";
  return {
    provider: "stripe",
    type: event.type,
    providerPaymentId,
    status: paid ? "SUCCEEDED" : "PENDING",
    paymentId,
    billing: paid ? billingFromStripeDetails(session.customer_details) : null,
  };
}

export function mapStripeEvent(event: Stripe.Event): PaymentWebhookEvent {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    return mapCheckoutSession(event, event.data.object as Stripe.Checkout.Session);
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const providerPaymentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.id;
    if (!charge.refunded) {
      return {
        provider: "stripe",
        type: event.type,
        providerPaymentId,
        status: "PENDING",
        paymentId: charge.metadata?.paymentId ?? undefined,
      };
    }
    return {
      provider: "stripe",
      type: event.type,
      providerPaymentId,
      status: "REFUNDED",
      paymentId: charge.metadata?.paymentId ?? undefined,
    };
  }
  if (event.type === "payment_intent.payment_failed" || event.type === "checkout.session.async_payment_failed") {
    const object = event.data.object as Stripe.PaymentIntent | Stripe.Checkout.Session;
    const paymentId =
      "metadata" in object ? object.metadata?.paymentId ?? undefined : undefined;
    const providerPaymentId = object.id;
    return {
      provider: "stripe",
      type: event.type,
      providerPaymentId,
      status: "FAILED",
      paymentId,
    };
  }
  return {
    provider: "stripe",
    type: event.type,
    providerPaymentId: event.id,
    status: "PENDING",
  };
}
