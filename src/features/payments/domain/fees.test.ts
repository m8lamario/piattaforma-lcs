import { describe, expect, it } from "vitest";
import {
  applyPendingSnapshot,
  centsToDecimalString,
  decimalToCents,
  parseEuroToCents,
  resolveParticipantFee,
  resolveTeamFee,
} from "./fees";

const edition = { player: "40.00", staff: "5.00", team: "200.00" };

describe("quote squadra", () => {
  it("preferisce la quota della squadra e lascia le altre sulla predefinita", () => {
    const playerA = resolveParticipantFee({
      category: "PLAYER",
      paymentMode: "PLAYER",
      teamPlayerFeeCents: 5500,
      teamStaffFeeCents: null,
      editionPlayerFee: edition.player,
      editionStaffFee: edition.staff,
    });
    const playerB = resolveParticipantFee({
      category: "PLAYER",
      paymentMode: "PLAYER",
      teamPlayerFeeCents: null,
      teamStaffFeeCents: 900,
      editionPlayerFee: edition.player,
      editionStaffFee: edition.staff,
    });
    const staffA = resolveParticipantFee({
      category: "STAFF",
      paymentMode: "PLAYER",
      teamPlayerFeeCents: 5500,
      teamStaffFeeCents: null,
      editionPlayerFee: edition.player,
      editionStaffFee: edition.staff,
    });
    expect(playerA).toEqual({ status: "ready", cents: 5500 });
    expect(playerB).toEqual({ status: "ready", cents: 4000 });
    expect(staffA).toEqual({ status: "ready", cents: 500 });
  });

  it("non propaga la modifica di una squadra sull’altra", () => {
    const shared = {
      category: "PLAYER" as const,
      paymentMode: "PLAYER" as const,
      editionPlayerFee: edition.player,
      editionStaffFee: edition.staff,
    };
    const custom = resolveParticipantFee({ ...shared, teamPlayerFeeCents: 1500, teamStaffFeeCents: null });
    const other = resolveParticipantFee({ ...shared, teamPlayerFeeCents: null, teamStaffFeeCents: null });
    expect(custom).toEqual({ status: "ready", cents: 1500 });
    expect(other).toEqual({ status: "ready", cents: 4000 });
  });

  it("blocca il pagamento se manca sia la quota squadra sia quella di edizione", () => {
    expect(
      resolveParticipantFee({
        category: "PLAYER",
        paymentMode: "BOTH",
        teamPlayerFeeCents: null,
        teamStaffFeeCents: null,
        editionPlayerFee: null,
        editionStaffFee: "5.00",
      }),
    ).toEqual({ status: "missing" });
    expect(
      resolveTeamFee({ paymentMode: "TEAM", teamFeeCents: null, editionTeamFee: null }),
    ).toEqual({ status: "missing" });
  });

  it("non addebita il canale sbagliato", () => {
    expect(
      resolveParticipantFee({
        category: "PLAYER",
        paymentMode: "TEAM",
        teamPlayerFeeCents: 1000,
        teamStaffFeeCents: null,
        editionPlayerFee: edition.player,
        editionStaffFee: edition.staff,
      }).status,
    ).toBe("not_due");
    expect(resolveTeamFee({ paymentMode: "PLAYER", teamFeeCents: 1000, editionTeamFee: edition.team }).status).toBe(
      "not_due",
    );
  });

  it("conserva lo snapshot di un pagamento già avviato", () => {
    const resolved = resolveParticipantFee({
      category: "PLAYER",
      paymentMode: "PLAYER",
      teamPlayerFeeCents: 8000,
      teamStaffFeeCents: null,
      editionPlayerFee: edition.player,
      editionStaffFee: edition.staff,
    });
    expect(applyPendingSnapshot(4000, resolved)).toEqual({ status: "ready", cents: 4000 });
    expect(applyPendingSnapshot(null, resolved)).toEqual({ status: "ready", cents: 8000 });
  });

  it("accetta solo euro positivi con al massimo due decimali", () => {
    expect(parseEuroToCents("40,50")).toEqual({ ok: true, cents: 4050 });
    expect(parseEuroToCents("0")).toEqual({ ok: false });
    expect(parseEuroToCents("-1")).toEqual({ ok: false });
    expect(parseEuroToCents("10.999")).toEqual({ ok: false });
    expect(parseEuroToCents("abc")).toEqual({ ok: false });
    expect(decimalToCents("40.5")).toBe(4050);
    expect(centsToDecimalString(4050)).toBe("40.50");
  });
});
