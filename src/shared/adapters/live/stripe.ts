import Stripe from "stripe";
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
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: input.reference,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: { paymentId: input.reference },
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
      return { providerRef: session.id, redirectUrl: session.url };
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

export function mapStripeEvent(event: Stripe.Event): PaymentWebhookEvent {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId ?? session.client_reference_id ?? undefined;
    const providerPaymentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.id;
    const status = session.payment_status === "paid" ? "SUCCEEDED" : "PENDING";
    return {
      provider: "stripe",
      type: event.type,
      providerPaymentId,
      status,
      paymentId,
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
