import { describe, expect, it } from "vitest";
import {
  describeBankAllocationPerson,
  formatTransferDifference,
  parseTransferDate,
  parseTransferReference,
  previewBankAllocation,
  quoteBankTransfer,
  receivedDifference,
  type BankAllocationPerson,
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

function person(overrides: Partial<BankAllocationPerson> = {}): BankAllocationPerson {
  return {
    registrationId: "reg-1",
    userId: "user-1",
    name: "Ada Rossi",
    email: "ada@example.test",
    category: "PLAYER",
    linkedCents: null,
    feeCents: 4000,
    blocked: null,
    provider: null,
    ...overrides,
  };
}

describe("associazione persone al bonifico", () => {
  it("distingue giocatori e staff e calcola utilizzato, residuo e avanzamento", () => {
    const people = [
      person({ registrationId: "ada", name: "Ada" }),
      person({ registrationId: "bruno", name: "Bruno", blocked: "paid_elsewhere", provider: "stripe", feeCents: 4000 }),
      person({ registrationId: "chiara", name: "Chiara", category: "STAFF", feeCents: 500 }),
      person({ registrationId: "dario", name: "Dario", blocked: "inactive", feeCents: 4000 }),
    ];
    const preview = previewBankAllocation({
      receivedCents: 20000,
      people,
      selectedIds: ["ada", "chiara"],
    });

    expect(preview.reason).toBeNull();
    expect(preview.usedCents).toBe(4500);
    expect(preview.residualCents).toBe(15500);
    expect(preview.progressPercent).toBe(23);
    expect(preview.addIds).toEqual(["ada", "chiara"]);
    expect(preview.rows.find((row) => row.registrationId === "bruno")?.reason).toBe("paid_elsewhere");
    expect(preview.rows.find((row) => row.registrationId === "dario")?.state).toBe("blocked");
  });

  it("copre quattro quote da 40 euro su un bonifico da 200 e lascia il residuo", () => {
    const people = ["a", "b", "c", "d", "e"].map((id) => person({ registrationId: id, userId: id, name: id }));
    const preview = previewBankAllocation({
      receivedCents: 20000,
      people,
      selectedIds: ["a", "b", "c", "d"],
    });
    expect(preview.usedCents).toBe(16000);
    expect(preview.residualCents).toBe(4000);
    expect(preview.progressPercent).toBe(80);
    expect(preview.rows.find((row) => row.registrationId === "e")?.reason).toBeNull();
  });

  it("non propone una persona se il residuo non basta e conserva lo snapshot già associato", () => {
    const people = [
      person({ registrationId: "eva", linkedCents: 4000, feeCents: 5500 }),
      person({ registrationId: "franco", feeCents: 4000 }),
    ];
    const kept = previewBankAllocation({ receivedCents: 4500, people, selectedIds: ["eva"] });
    expect(kept.reason).toBeNull();
    expect(kept.usedCents).toBe(4000);
    expect(kept.residualCents).toBe(500);
    expect(kept.rows.find((row) => row.registrationId === "franco")?.reason).toBe("insufficient");

    const over = previewBankAllocation({ receivedCents: 4500, people, selectedIds: ["eva", "franco"] });
    expect(over.reason).toBe("insufficient");
    expect(over.addIds).toEqual(["franco"]);
  });

  it("libera residuo quando si toglie una persona già associata, anche se l'importo storico supera il bonifico", () => {
    const people = [
      person({ registrationId: "eva", linkedCents: 4000 }),
      person({ registrationId: "gina", linkedCents: 4000 }),
      person({ registrationId: "nuovo", feeCents: 4000 }),
    ];
    const legacy = previewBankAllocation({ receivedCents: 6000, people, selectedIds: ["eva", "gina"] });
    expect(legacy.reason).toBeNull();
    expect(legacy.overCents).toBe(2000);

    const freed = previewBankAllocation({ receivedCents: 8000, people, selectedIds: ["eva", "nuovo"] });
    expect(freed.reason).toBeNull();
    expect(freed.removeIds).toEqual(["gina"]);
    expect(freed.addIds).toEqual(["nuovo"]);
    expect(freed.usedCents).toBe(8000);
    expect(freed.residualCents).toBe(0);

    const stillOver = previewBankAllocation({ receivedCents: 6000, people, selectedIds: ["eva", "nuovo"] });
    expect(stillOver.reason).toBe("insufficient");
  });

  it("rifiuta una quota senza importo, una iscrizione chiusa e un id estraneo", () => {
    const described = describeBankAllocationPerson({
      registrationId: "mia",
      userId: "mia",
      name: "Mia",
      email: "mia@example.test",
      category: "PLAYER",
      registrationStatus: "REMOVED",
      fee: { status: "ready", cents: 4000 },
      linkedCents: null,
      otherProvider: null,
    });
    expect(described.blocked).toBe("inactive");

    const missing = describeBankAllocationPerson({
      registrationId: "leo",
      userId: "leo",
      name: "Leo",
      email: "leo@example.test",
      category: "STAFF",
      registrationStatus: "IN_PROGRESS",
      fee: { status: "missing" },
      linkedCents: null,
      otherProvider: null,
    });
    expect(missing.blocked).toBe("fee_missing");

    const preview = previewBankAllocation({
      receivedCents: 20000,
      people: [described],
      selectedIds: ["mia", "sconosciuto"],
    });
    expect(preview.reason).toBe("inactive");
  });

  it("tiene associata una persona già collegata anche se la quota di oggi manca", () => {
    const linked = describeBankAllocationPerson({
      registrationId: "eva",
      userId: "eva",
      name: "Eva",
      email: "eva@example.test",
      category: "PLAYER",
      registrationStatus: "WITHDRAWN",
      fee: { status: "missing" },
      linkedCents: 4000,
      otherProvider: null,
    });
    expect(linked.blocked).toBeNull();
    const preview = previewBankAllocation({ receivedCents: 4000, people: [linked], selectedIds: [] });
    expect(preview.removeIds).toEqual(["eva"]);
    expect(preview.reason).toBeNull();
    expect(preview.usedCents).toBe(0);
  });
});
