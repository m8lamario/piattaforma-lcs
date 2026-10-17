import { describe, expect, it } from "vitest";
import { hasCompleteGuardian, hasCompletePersonalData, hasIdentityPersonalData, hasMinorGuardianRequirement } from "./personal";

const identity = {
  firstName: "Eva",
  lastName: "Test",
  birthDate: new Date("1980-01-01T00:00:00.000Z"),
  fiscalCode: "RSSMRA80A01H501U",
  phone: "+393331234567",
};

describe("dati personali giocatore", () => {
  it("un nuovo giocatore senza taglia non ha i dati completi", () => {
    expect(hasCompletePersonalData({ ...identity, firstName: null, shirtSize: null })).toBe(false);
  });

  it("un giocatore già registrato senza taglia deve ancora inserirla", () => {
    expect(hasIdentityPersonalData({ ...identity, shirtSize: null })).toBe(true);
    expect(hasCompletePersonalData({ ...identity, shirtSize: null })).toBe(false);
    expect(hasCompletePersonalData({ ...identity, shirtSize: "XX" })).toBe(false);
  });

  it("un giocatore con taglia valida non deve ripetere l’inserimento", () => {
    expect(hasCompletePersonalData({ ...identity, shirtSize: "M" })).toBe(true);
  });

  it("lo staff tecnico è completo senza taglia", () => {
    expect(hasCompletePersonalData({ ...identity, shirtSize: null }, { requireShirtSize: false })).toBe(true);
  });
});

describe("requisito tutore", () => {
  const primary = {
    firstName: "Maria",
    lastName: "Rossi",
    relationship: "GENITORE",
    email: "maria@example.test",
    phone: "+390212345678",
  };

  it("è completo con unico esercente", () => {
    expect(hasCompleteGuardian(primary)).toBe(true);
    expect(hasMinorGuardianRequirement({ primary, g3: "SOLE" })).toBe(true);
  });

  it("con altro genitore richiede la seconda email", () => {
    expect(hasMinorGuardianRequirement({ primary, g3: "OTHER_PARENT" })).toBe(false);
    expect(
      hasMinorGuardianRequirement({
        primary,
        g3: "OTHER_PARENT",
        secondaryEmail: "altro@example.test",
      }),
    ).toBe(true);
  });
});
