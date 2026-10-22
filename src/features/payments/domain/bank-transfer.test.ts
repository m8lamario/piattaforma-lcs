import { describe, expect, it } from "vitest";
import {
  formatTransferDifference,
  parseTransferDate,
  parseTransferReference,
  quoteBankTransfer,
  receivedDifference,
  type BankTransferMember,
} from "./bank-transfer";

const player = (overrides: Partial<BankTransferMember> = {}): BankTransferMember => ({
  registrationId: "reg-1",
  userId: "user-1",
  category: "PLAYER",
  name: "Ada Rossi",
  status: "IN_PROGRESS",
  succeededProvider: null,
  ...overrides,
});

describe("bonifico di squadra", () => {
  it("somma le quote dei giocatori e dello staff e lascia fuori chi ha già pagato", () => {
    const quote = quoteBankTransfer({
      paymentMode: "PLAYER",
      currency: "EUR",
      teamCovered: false,
      teamFee: { status: "not_due" },
      members: [
        player({ registrationId: "a", userId: "ua", name: "Ada" }),
        player({
          registrationId: "b",
          userId: "ub",
          name: "Bruno",
          succeededProvider: "stripe",
        }),
        player({
          registrationId: "c",
          userId: "uc",
          name: "Chiara",
          category: "STAFF",
        }),
        player({ registrationId: "d", userId: "ud", name: "Dario", status: "REMOVED" }),
      ],
      feeFor: (category) => ({ status: "ready", cents: category === "STAFF" ? 500 : 4000 }),
    });

    expect(quote.status).toBe("ready");
    if (quote.status !== "ready") return;
    expect(quote.channel).toBe("members");
    expect(quote.expectedCents).toBe(4500);
    expect(quote.due.map((line) => line.name)).toEqual(["Ada", "Chiara"]);
    expect(quote.skipped).toEqual([{ name: "Bruno", category: "PLAYER", provider: "stripe" }]);
  });

  it("usa quote diverse per due squadre della stessa edizione", () => {
    const lions = quoteBankTransfer({
      paymentMode: "BOTH",
      currency: "EUR",
      teamCovered: false,
      teamFee: { status: "ready", cents: 20000 },
      members: [player({ name: "Ada" })],
      feeFor: () => ({ status: "ready", cents: 5500 }),
    });
    const wolves = quoteBankTransfer({
      paymentMode: "BOTH",
      currency: "EUR",
      teamCovered: false,
      teamFee: { status: "ready", cents: 20000 },
      members: [player({ name: "Elena" })],
      feeFor: () => ({ status: "ready", cents: 4000 }),
    });
    expect(lions.status === "ready" && lions.expectedCents).toBe(5500);
    expect(wolves.status === "ready" && wolves.expectedCents).toBe(4000);
  });

  it("in modalità squadra usa la quota squadra e non la somma delle persone", () => {
    const quote = quoteBankTransfer({
      paymentMode: "TEAM",
      currency: "EUR",
      teamCovered: false,
      teamFee: { status: "ready", cents: 20000 },
      members: [player(), player({ registrationId: "s", userId: "us", category: "STAFF", name: "Staff" })],
      feeFor: () => ({ status: "not_due" }),
    });
    expect(quote).toMatchObject({
      status: "ready",
      channel: "team",
      expectedCents: 20000,
      due: [],
    });
    if (quote.status === "ready") expect(quote.roster).toHaveLength(2);
  });

  it("non propone un secondo bonifico se la quota squadra è già coperta", () => {
    const quote = quoteBankTransfer({
      paymentMode: "TEAM",
      currency: "EUR",
      teamCovered: true,
      teamFee: { status: "ready", cents: 20000 },
      members: [player()],
      feeFor: () => ({ status: "not_due" }),
    });
    expect(quote.status).toBe("nothing_due");
  });

  it("blocca il totale se manca una quota e segnala lo scostamento dell'importo ricevuto", () => {
    const missing = quoteBankTransfer({
      paymentMode: "PLAYER",
      currency: "EUR",
      teamCovered: false,
      teamFee: { status: "not_due" },
      members: [player({ name: "Ada" })],
      feeFor: () => ({ status: "missing" }),
    });
    expect(missing).toEqual({ status: "missing", names: ["Ada"] });
    expect(receivedDifference(75000, 80000)).toBe(-5000);
    expect(formatTransferDifference(-5000, "EUR")).toBe("50,00 EUR in meno rispetto al totale previsto");
    expect(formatTransferDifference(0, "EUR")).toBeNull();
  });

  it("accetta un riferimento e una data non futura", () => {
    expect(parseTransferReference("  CRO 123  ")).toBe("CRO 123");
    expect(parseTransferReference("a")).toBeNull();
    const now = new Date("2026-10-22T10:00:00.000Z");
    expect(parseTransferDate("2026-10-22", now)?.toISOString()).toBe("2026-10-22T12:00:00.000Z");
    expect(parseTransferDate("2026-10-23", now)).toBeNull();
  });
});
