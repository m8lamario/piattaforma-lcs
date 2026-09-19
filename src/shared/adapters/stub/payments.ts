import type { PaymentAdapter } from "../types";

export const stubPaymentAdapter: PaymentAdapter = {
  async createCheckout(input) {
    return {
      providerRef: `stub_${input.reference}`,
      redirectUrl: input.successUrl,
    };
  },
  async parseWebhook() {
    return {
      provider: "stub",
      type: "payment.ignored",
      providerPaymentId: "stub",
      status: "PENDING",
    };
  },
};
