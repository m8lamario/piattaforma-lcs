import { describe, expect, it } from "vitest";
import { parseBulkInviteCsv } from "./bulk";

describe("parseBulkInviteCsv", () => {
  it("accetta le righe valide e non blocca le altre se una è invalida", () => {
    const result = parseBulkInviteCsv(
      [
        "email,firstName,lastName",
        "anna@esempio.it,Anna,Rossi",
        "not-an-email,Luca,Verdi",
        "marco@esempio.it,Marco,Neri",
      ].join("\n"),
    );
    expect(result.rows).toEqual([
      { email: "anna@esempio.it", firstName: "Anna", lastName: "Rossi" },
      { email: "marco@esempio.it", firstName: "Marco", lastName: "Neri" },
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.line).toBe(3);
  });

  it("rifiuta colonne extra (es. codice fiscale)", () => {
    const result = parseBulkInviteCsv("anna@esempio.it,Anna,Rossi,RSSMRA80A01H501U");
    expect(result.rows).toEqual([]);
    expect(result.errors[0]?.message).toMatch(/codice fiscale/i);
  });
});
