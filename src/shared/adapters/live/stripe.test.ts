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
    });
  });
});
