import { describe, expect, it } from "vitest";
import { ageOn, isMinor, needsMediaAgreement } from "./age";

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("isMinor", () => {
  const on = utcDate(2026, 9, 19);

  it("tratta come minore chi compie 18 anni il giorno dopo", () => {
    expect(isMinor(utcDate(2008, 9, 20), on)).toBe(true);
  });

  it("tratta come maggiorenne chi compie 18 anni oggi", () => {
    expect(isMinor(utcDate(2008, 9, 19), on)).toBe(false);
    expect(ageOn(utcDate(2008, 9, 19), on)).toBe(18);
  });

  it("richiede il tutore solo sotto la soglia di 18", () => {
    expect(isMinor(utcDate(2009, 1, 1), on)).toBe(true);
    expect(isMinor(utcDate(2000, 1, 1), on)).toBe(false);
  });

  it("dai 14 anni il minore deve confermare G14; sotto i 14 no", () => {
    expect(needsMediaAgreement(utcDate(2012, 9, 19), on)).toBe(true);
    expect(needsMediaAgreement(utcDate(2013, 9, 19), on)).toBe(false);
    expect(needsMediaAgreement(utcDate(2008, 9, 19), on)).toBe(false);
  });
});
