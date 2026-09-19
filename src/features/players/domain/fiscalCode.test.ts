import { describe, expect, it } from "vitest";
import { fiscalCodeControlChar, isValidFiscalCode, normalizeFiscalCode } from "./fiscalCode";

describe("fiscalCode", () => {
  it("normalizza spazi e minuscole", () => {
    expect(normalizeFiscalCode(" rss mra80a01h501u ")).toBe("RSSMRA80A01H501U");
  });

  it("accetta un codice il cui carattere di controllo coincide", () => {
    const body = "RSSMRA80A01H501";
    const code = `${body}${fiscalCodeControlChar(body)}`;
    expect(isValidFiscalCode(code)).toBe(true);
  });

  it("rifiuta formato o checksum errati", () => {
    expect(isValidFiscalCode("abc")).toBe(false);
    const body = "RSSMRA80A01H501";
    const valid = `${body}${fiscalCodeControlChar(body)}`;
    const tampered = `${valid.slice(0, 15)}${valid[15] === "Z" ? "A" : "Z"}`;
    expect(isValidFiscalCode(tampered)).toBe(false);
  });
});
