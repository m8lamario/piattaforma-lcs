import { describe, expect, it } from "vitest";
import {
  isConsentReceiptReady,
  isMediaComplete,
  isPrivacyPackComplete,
  mediaDecisionFrom,
  privacySlugsFor,
} from "./pack";

describe("consent pack", () => {
  it("richiede l’informativa minori solo se il giocatore è minorenne", () => {
    expect(privacySlugsFor(false)).toEqual(["privacy-policy", "document-processing"]);
    expect(privacySlugsFor(true)).toContain("minor-privacy");
  });

  it("non completa la privacy senza versionId corrente accettato", () => {
    expect(
      isPrivacyPackComplete(false, [
        { slug: "privacy-policy", versionId: "", isCurrent: true, accepted: true },
        { slug: "document-processing", versionId: "v1", isCurrent: true, accepted: true },
      ]),
    ).toBe(false);
    expect(
      isPrivacyPackComplete(false, [
        { slug: "privacy-policy", versionId: "v1", isCurrent: true, accepted: true },
        { slug: "document-processing", versionId: "v1", isCurrent: true, accepted: true },
      ]),
    ).toBe(true);
  });

  it("con media opzionale il rifiuto esplicito completa il requisito", () => {
    expect(isMediaComplete(false, "refused")).toBe(true);
    expect(isMediaComplete(true, "refused")).toBe(false);
    expect(isMediaComplete(true, "accepted")).toBe(true);
    expect(isMediaComplete(false, "none")).toBe(false);
    expect(
      mediaDecisionFrom([
        { slug: "media-release", versionId: "v1", isCurrent: true, accepted: false },
      ]),
    ).toBe("refused");
  });

  it("prepara la ricevuta solo con privacy corrente e decisione media", () => {
    const adult = [
      { slug: "privacy-policy", versionId: "v1", isCurrent: true, accepted: true },
      { slug: "document-processing", versionId: "v1", isCurrent: true, accepted: true },
    ];
    expect(isConsentReceiptReady(false, { applies: true, required: false }, adult)).toBe(false);
    expect(
      isConsentReceiptReady(false, { applies: true, required: false }, [
        ...adult,
        { slug: "media-release", versionId: "v1", isCurrent: true, accepted: false },
      ]),
    ).toBe(true);
    expect(
      isConsentReceiptReady(false, { applies: true, required: true }, [
        ...adult,
        { slug: "media-release", versionId: "v1", isCurrent: true, accepted: false },
      ]),
    ).toBe(false);
    expect(isConsentReceiptReady(false, { applies: false, required: false }, adult)).toBe(true);
  });
});
