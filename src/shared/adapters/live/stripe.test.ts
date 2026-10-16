import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { InvalidWebhookSignatureError, createStripePaymentAdapter, mapStripeEvent } from "./stripe";

describe("stripe webhook", () => {
  it("rifiuta una firma assente o invalida", async () => {
    const adapter = createStripePaymentAdapter({
      secretKey: "sk_test_placeholder",
      webhookSecret: "whsec_test_placeholder",
    });
    await expect(
      adapter.parseWebhook({ headers: new Headers(), rawBody: "{}" }),
    ).rejects.toBeInstanceOf(InvalidWebhookSignatureError);

    await expect(
      adapter.parseWebhook({
        headers: new Headers({ "stripe-signature": "t=1,v1=deadbeef" }),
        rawBody: "{}",
      }),
    ).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it("mappa checkout.session.completed senza PAN", () => {
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          payment_intent: "pi_1",
          payment_status: "paid",
          metadata: { paymentId: "pay_1" },
          client_reference_id: "pay_1",
        },
      },
    } as unknown as Stripe.Event;
    expect(mapStripeEvent(event)).toEqual({
      provider: "stripe",
      type: "checkout.session.completed",
      providerPaymentId: "pi_1",
      status: "SUCCEEDED",
      paymentId: "pay_1",
      billing: null,
    });
  });

  it("non segna riuscito un checkout non pagato e non inventa l’indirizzo", () => {
    const event = {
      id: "evt_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_2",
          payment_intent: "pi_2",
          payment_status: "unpaid",
          metadata: { paymentId: "pay_2" },
          customer_details: { name: "Ada Rossi", address: { city: "Torino" } },
        },
      },
    } as unknown as Stripe.Event;
    const mapped = mapStripeEvent(event);
    expect(mapped.status).toBe("PENDING");
    expect(mapped.billing).toBeNull();
  });

  it("salva la fatturazione Stripe solo se il pagamento è paid", () => {
    const event = {
      id: "evt_3",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_3",
          payment_intent: "pi_3",
          payment_status: "paid",
          metadata: { paymentId: "pay_3" },
          customer_details: {
            name: "Ada Rossi",
            email: "ada@example.test",
            address: {
              line1: "Via Roma 1",
              postal_code: "10100",
              city: "Torino",
              state: "TO",
              country: "IT",
            },
          },
        },
      },
    } as unknown as Stripe.Event;
    expect(mapStripeEvent(event).billing).toEqual({
      billingName: "Ada Rossi",
      billingEmail: "ada@example.test",
      line1: "Via Roma 1",
      line2: null,
      postalCode: "10100",
      city: "Torino",
      state: "TO",
      country: "IT",
    });
  });

  it("segna rimborsato solo un charge completamente refunded", () => {
    const full = {
      id: "evt_4",
      type: "charge.refunded",
      data: { object: { id: "ch_1", refunded: true, payment_intent: "pi_3", metadata: {} } },
    } as unknown as Stripe.Event;
    expect(mapStripeEvent(full).status).toBe("REFUNDED");
    const partial = {
      id: "evt_5",
      type: "charge.refunded",
      data: { object: { id: "ch_2", refunded: false, payment_intent: "pi_3", metadata: {} } },
    } as unknown as Stripe.Event;
    expect(mapStripeEvent(partial).status).toBe("PENDING");
  });
});
