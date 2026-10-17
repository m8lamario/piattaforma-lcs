import { describe, expect, it } from "vitest";
import { personalDataSchema, staffPersonalDataSchema } from "./personal";

const valid = {
  firstName: "Eva",
  lastName: "Test",
  birthDate: "1980-01-01",
  fiscalCode: "RSSMRA80A01H501U",
  phone: "3331234567",
  intent: "continue" as const,
};

describe("schema dati personali", () => {
  it("obbliga la taglia al giocatore", () => {
    expect(personalDataSchema.safeParse(valid).success).toBe(false);
    expect(personalDataSchema.safeParse({ ...valid, shirtSize: "M" }).success).toBe(true);
    expect(personalDataSchema.safeParse({ ...valid, shirtSize: "XX" }).success).toBe(false);
  });

  it("non chiede la taglia allo staff tecnico", () => {
    expect(staffPersonalDataSchema.safeParse(valid).success).toBe(true);
    expect(staffPersonalDataSchema.safeParse({ ...valid, shirtSize: "M" }).success).toBe(true);
  });
});
