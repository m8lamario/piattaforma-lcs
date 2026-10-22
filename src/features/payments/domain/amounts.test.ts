import { describe, expect, it } from "vitest";
import { participantCheckoutAmount, playerCheckoutAmount, staffCheckoutAmount, teamCheckoutAmount } from "./amounts";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";

describe("payment amounts and cover", () => {
  it("non propone checkout giocatore se la modalità è solo TEAM", () => {
    expect(playerCheckoutAmount({ paymentMode: "TEAM", playerFeeAmount: 40 })).toBeNull();
    expect(teamCheckoutAmount({ paymentMode: "PLAYER", teamFeeAmount: 200 })).toBeNull();
  });

  it("non inventa un importo se la quota di edizione manca", () => {
    expect(playerCheckoutAmount({ paymentMode: "PLAYER", playerFeeAmount: null })).toBeNull();
    expect(teamCheckoutAmount({ paymentMode: "TEAM", teamFeeAmount: null })).toBeNull();
    expect(staffCheckoutAmount({ paymentMode: "PLAYER", staffFeeAmount: null })).toBeNull();
  });

  it("applica allo staff la quota staff e al giocatore la propria, in centesimi", () => {
    expect(staffCheckoutAmount({ paymentMode: "PLAYER", staffFeeAmount: 5 })).toBe(500);
    expect(staffCheckoutAmount({ paymentMode: "TEAM", staffFeeAmount: 5 })).toBeNull();
    expect(playerCheckoutAmount({ paymentMode: "PLAYER", playerFeeAmount: 40 })).toBe(4000);
    expect(
      participantCheckoutAmount({
        category: "STAFF",
        paymentMode: "PLAYER",
        playerFeeAmount: 40,
        staffFeeAmount: 5,
      }),
    ).toBe(500);
    expect(
      participantCheckoutAmount({
        category: "PLAYER",
        paymentMode: "PLAYER",
        playerFeeAmount: 40,
        staffFeeAmount: 5,
        playerFeeCents: 5500,
      }),
    ).toBe(5500);
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
