import { describe, expect, it } from "vitest";
import {
  consentReceiptFingerprint,
  consentReceiptRows,
  latestConsentSnapshots,
  legalVersionAbsoluteUrl,
} from "./receipt";

const privacy = {
  slug: "privacy-policy",
  version: "placeholder-1",
  title: "Informativa privacy",
  accepted: true,
  acceptedAt: 100,
};
const documents = {
  slug: "document-processing",
  version: "placeholder-1",
  title: "Informativa documenti caricati",
  accepted: true,
  acceptedAt: 110,
};
const media = {
  slug: "media-release",
  version: "placeholder-2",
  title: "Liberatoria foto, video e social",
  accepted: false,
  acceptedAt: 120,
};

describe("ricevuta consensi", () => {
  it("prende l’ultimo record per slug e ordina l’impronta", () => {
    const olderPrivacy = { ...privacy, version: "placeholder-0", acceptedAt: 10 };
    const latest = latestConsentSnapshots([media, olderPrivacy, documents, privacy]);
    expect(latest.map((row) => row.slug)).toEqual([
      "document-processing",
      "media-release",
      "privacy-policy",
    ]);
    expect(consentReceiptFingerprint([documents, media, olderPrivacy, privacy])).toBe(
      "document-processing:placeholder-1:1|media-release:placeholder-2:0|privacy-policy:placeholder-1:1",
    );
  });

  it("costruisce i link alla versione accettata, non alla pagina corrente", () => {
    expect(legalVersionAbsoluteUrl("privacy-policy", "placeholder-1", "https://hub.test/")).toBe(
      "https://hub.test/documenti-legali/privacy-policy/placeholder-1",
    );
    const rows = consentReceiptRows([privacy, media], "https://hub.test");
    expect(rows).toEqual([
      {
        title: media.title,
        version: "placeholder-2",
        accepted: false,
        url: "https://hub.test/documenti-legali/media-release/placeholder-2",
      },
      {
        title: privacy.title,
        version: "placeholder-1",
        accepted: true,
        url: "https://hub.test/documenti-legali/privacy-policy/placeholder-1",
      },
    ]);
  });
});
