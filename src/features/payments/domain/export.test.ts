import { describe, expect, it } from "vitest";
import { billingFill } from "./billing";
import {
  exportIdentity,
  paymentRoleLabel,
  paymentsToCsv,
  type PaymentRegisterRow,
} from "./export";

const row = (overrides: Partial<PaymentRegisterRow> = {}): PaymentRegisterRow => ({
  firstName: "Ada",
  lastName: "Rossi",
  email: "ada@example.test",
  billingName: "Ada Rossi",
  residenceLine: "",
  residencePostalCode: "",
  residenceCity: "",
  residenceProvince: "",
  billingLine: "Via Roma 1",
  billingPostalCode: "10100",
  billingCity: "Torino",
  billingProvince: "TO",
  billingCountry: "IT",
  amount: "5.00",
  currency: "EUR",
  paidOn: "2026-10-16",
  role: "Staff tecnico",
  status: "Riuscito",
  transactionId: "pi_1",
  method: "Stripe",
  ...overrides,
});

describe("registro pagamenti", () => {
  it("usa nome e email LCS e non copia la fatturazione nella residenza", () => {
    const identity = exportIdentity({
      firstName: "Ada",
      lastName: "Rossi",
      userEmail: "ada@example.test",
      billingEmail: "altra@example.test",
    });
    expect(identity).toEqual({ firstName: "Ada", lastName: "Rossi", email: "ada@example.test" });
    const csv = paymentsToCsv([row()]);
    const columns = csv.trim().split("\r\n")[1]?.split(";") ?? [];
    expect(columns[4]).toBe("");
    expect(columns[5]).toBe("");
    expect(columns[8]).toBe("Via Roma 1");
    expect(csv).toContain("Metodo");
    expect(csv).toContain("Stripe");
    expect(paymentRoleLabel({ category: "PLAYER", teamFee: false })).toBe("Giocatore");
    expect(paymentRoleLabel({ category: "STAFF", teamFee: false })).toBe("Staff tecnico");
    expect(paymentRoleLabel({ category: null, teamFee: true })).toBe("Quota squadra");
  });

  it("lascia vuoti i campi assenti e neutralizza le formule", () => {
    const csv = paymentsToCsv([
      row({
        firstName: "=cmd",
        lastName: "",
        email: "",
        billingName: "",
        billingLine: "",
        billingPostalCode: "",
        billingCity: "",
        billingProvince: "",
        billingCountry: "",
        paidOn: "",
        transactionId: "",
        status: "In attesa",
      }),
    ]);
    expect(csv).toContain("'=cmd");
    expect(csv).not.toContain("Via Roma");
  });

  it("non sovrascrive una fatturazione già salvata", () => {
    const patch = billingFill(
      {
        billingName: "Ada Rossi",
        billingEmail: "ada@example.test",
        billingLine1: "Via Roma 1",
        billingLine2: null,
        billingPostalCode: "10100",
        billingCity: "Torino",
        billingState: "TO",
        billingCountry: "IT",
      },
      {
        billingName: "Altro Nome",
        billingEmail: null,
        line1: "Via Nuova",
        line2: "Scala B",
        postalCode: null,
        city: null,
        state: null,
        country: null,
      },
    );
    expect(patch).toEqual({ billingLine2: "Scala B" });
  });
});
