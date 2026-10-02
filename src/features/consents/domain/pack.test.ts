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
    expect(privacySlugsFor(false)).toEqual(["privacy-policy", "document-processing", "terms"]);
    expect(privacySlugsFor(true)).toContain("minor-privacy");
  });

  it("completa la privacy senza versionId corrente accettato è falso; i termini sono nel pacchetto", () => {
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
        { slug: "terms", versionId: "v1", isCurrent: true, accepted: true },
      ]),
    ).toBe(true);
  });

  it("con il passo liberatorie inviato il requisito è completo anche se gli usi sono vuoti", () => {
    expect(isMediaComplete(false, "submitted")).toBe(true);
    expect(isMediaComplete(true, "submitted")).toBe(true);
    expect(isMediaComplete(true, "none")).toBe(false);
    expect(
      mediaDecisionFrom([
        { slug: "media-release", versionId: "v1", isCurrent: true, accepted: false },
      ]),
    ).toBe("submitted");
  });

  it("prepara la ricevuta solo con privacy corrente e decisione media", () => {
    const adult = [
      { slug: "privacy-policy", versionId: "v1", isCurrent: true, accepted: true },
      { slug: "document-processing", versionId: "v1", isCurrent: true, accepted: true },
      { slug: "terms", versionId: "v1", isCurrent: true, accepted: true },
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
    ).toBe(true);
    expect(isConsentReceiptReady(false, { applies: false, required: false }, adult)).toBe(true);
  });
});
