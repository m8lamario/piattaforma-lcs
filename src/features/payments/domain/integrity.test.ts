import { describe, expect, it } from "vitest";
import { playerCheckoutBlocker, teamCheckoutBlocker, webhookApplyDecision } from "./integrity";

describe("checkout blockers", () => {
  it("rifiuta un secondo pagamento già coperto", () => {
    expect(playerCheckoutBlocker({ covered: true, amount: 40 })).toBe("PAYMENT_ALREADY_COMPLETED");
    expect(teamCheckoutBlocker({ covered: true, amount: 200 })).toBe("PAYMENT_ALREADY_COMPLETED");
  });

  it("rifiuta il canale sbagliato", () => {
    expect(playerCheckoutBlocker({ covered: false, amount: null })).toBe("PAYMENT_TEAM_PAYS");
    expect(teamCheckoutBlocker({ covered: false, amount: null })).toBe("PAYMENT_PLAYER_PAYS");
  });

  it("consente il primo checkout", () => {
    expect(playerCheckoutBlocker({ covered: false, amount: 40 })).toBeNull();
  });
});

describe("duplicate webhook", () => {
  it("è idempotente se lo stato coincide", () => {
    expect(
      webhookApplyDecision({
        current: { id: "pay-1", status: "SUCCEEDED" },
        incomingStatus: "SUCCEEDED",
        otherSucceededWithSameProviderId: false,
      }),
    ).toBe("idempotent");
  });

  it("rileva un providerPaymentId già riuscito su un altro pagamento", () => {
    expect(
      webhookApplyDecision({
        current: { id: "pay-2", status: "PENDING" },
        incomingStatus: "SUCCEEDED",
        otherSucceededWithSameProviderId: true,
      }),
    ).toBe("duplicate");
  });

  it("applica PENDING/FAILED → SUCCEEDED", () => {
    expect(
      webhookApplyDecision({
        current: { id: "pay-1", status: "PENDING" },
        incomingStatus: "SUCCEEDED",
        otherSucceededWithSameProviderId: false,
      }),
    ).toBe("apply");
  });

  it("confligge se lo stato non è avanzabile", () => {
    expect(
      webhookApplyDecision({
        current: { id: "pay-1", status: "REFUNDED" },
        incomingStatus: "SUCCEEDED",
        otherSucceededWithSameProviderId: false,
      }),
    ).toBe("conflict");
  });
});
