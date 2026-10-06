import { describe, expect, it } from "vitest";
import {
  decideConsentWrite,
  decodeConsent,
  encodeConsent,
  mayLoadCategory,
  parseConsentIntent,
  safeReturnPath,
  shouldShowCookieBanner,
} from "./consent";

describe("consenso cookie", () => {
  it("tiene spenti analytics e marketing senza una scelta, e lascia attivi i tecnici", () => {
    expect(mayLoadCategory("necessary", null, [])).toBe(true);
    expect(mayLoadCategory("analytics", null, ["analytics"])).toBe(false);
    expect(mayLoadCategory("marketing", null, ["marketing"])).toBe(false);
    expect(mayLoadCategory("analytics", { v: 1, analytics: true, marketing: false }, [])).toBe(false);
  });

  it("accende una categoria solo se è prevista e la scelta è affermativa", () => {
    const stored = decodeConsent(encodeConsent({ v: 1, analytics: true, marketing: false }));
    expect(stored).toEqual({ v: 1, analytics: true, marketing: false });
    expect(mayLoadCategory("analytics", stored, ["analytics"])).toBe(true);
    expect(mayLoadCategory("marketing", stored, ["analytics", "marketing"])).toBe(false);
  });

  it("rifiuta valori di consenso non riconosciuti", () => {
    expect(decodeConsent("v1.a1")).toBeNull();
    expect(decodeConsent("analytics=1")).toBeNull();
    expect(parseConsentIntent("accept-all")).toBe("invalid");
  });

  it("non mostra il banner se non ci sono strumenti non necessari", () => {
    expect(shouldShowCookieBanner(0, null)).toBe(false);
    expect(shouldShowCookieBanner(1, null)).toBe(true);
    expect(shouldShowCookieBanner(1, { v: 1, analytics: false, marketing: false })).toBe(false);
  });

  it("non scrive un cookie di scelta se la categoria non necessaria è vuota", () => {
    expect(
      decideConsentWrite({
        optionalCategories: [],
        intent: "accept",
        analytics: true,
        marketing: true,
      }),
    ).toEqual({ action: "delete" });
  });

  it("registra rifiuto e accettazione solo sulle categorie presenti", () => {
    expect(
      decideConsentWrite({
        optionalCategories: ["analytics"],
        intent: "accept",
        analytics: false,
        marketing: true,
      }),
    ).toEqual({ action: "set", value: "v1.a1.m0", maxAge: 60 * 60 * 24 * 180 });
    expect(
      decideConsentWrite({
        optionalCategories: ["analytics", "marketing"],
        intent: "reject",
        analytics: true,
        marketing: true,
      }).action,
    ).toBe("set");
    expect(
      decideConsentWrite({
        optionalCategories: ["analytics"],
        intent: "custom",
        analytics: false,
        marketing: true,
      }),
    ).toMatchObject({ value: "v1.a0.m0" });
  });

  it("cancella la scelta su revoca o intento non valido", () => {
    expect(
      decideConsentWrite({
        optionalCategories: ["marketing"],
        intent: "revoke",
        analytics: true,
        marketing: true,
      }),
    ).toEqual({ action: "delete" });
    expect(
      decideConsentWrite({
        optionalCategories: ["marketing"],
        intent: "invalid",
        analytics: true,
        marketing: true,
      }),
    ).toEqual({ action: "delete" });
  });

  it("accetta solo un percorso interno come ritorno", () => {
    expect(safeReturnPath("/area")).toBe("/area");
    expect(safeReturnPath("//evil.test")).toBe("/cookie");
    expect(safeReturnPath("https://evil.test")).toBe("/cookie");
  });
});
