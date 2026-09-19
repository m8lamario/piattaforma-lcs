import { describe, expect, it } from "vitest";
import { playerCheckoutAmount, teamCheckoutAmount } from "./amounts";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";

describe("payment amounts and cover", () => {
  it("non propone checkout giocatore se la modalità è solo TEAM", () => {
    expect(playerCheckoutAmount({ paymentMode: "TEAM", playerFeeAmount: 40 })).toBeNull();
    expect(teamCheckoutAmount({ paymentMode: "PLAYER", teamFeeAmount: 200 })).toBeNull();
  });

  it("usa 40 EUR placeholder se l’importo edizione manca (OD-008)", () => {
    expect(playerCheckoutAmount({ paymentMode: "PLAYER", playerFeeAmount: null })).toBe(40);
  });

  it("il primo SUCCEEDED utile copre, anche in modalità BOTH", () => {
    expect(
      isPaymentCovered({ mode: "BOTH", playerSucceeded: true, teamSucceeded: false }),
    ).toBe(true);
    expect(
      isPaymentCovered({ mode: "BOTH", playerSucceeded: false, teamSucceeded: true }),
    ).toBe(true);
    expect(
      isPaymentCovered({ mode: "TEAM", playerSucceeded: true, teamSucceeded: false }),
    ).toBe(false);
  });
});
