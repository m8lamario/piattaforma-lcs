import { describe, expect, it } from "vitest";
import { adminDocumentSelect, documentKindMismatch } from "./adminView";

describe("admin document list projection", () => {
  it("non include storageKey", () => {
    expect(JSON.stringify(adminDocumentSelect)).not.toContain("storageKey");
    expect(JSON.stringify(adminDocumentSelect)).not.toContain("checksumSha256");
  });

  it("segnala lo scostamento di kind senza cambiare lo stato", () => {
    const document = {
      requiredKindAtUpload: "COMPETITIVE" as const,
      registration: { team: { edition: { medicalCertificateKind: "NON_COMPETITIVE" as const } } },
      inspection: { recognizedKind: "COMPETITIVE" as const, anomalies: [] as string[] },
    };
    expect(documentKindMismatch(document)).toBe(true);
    expect(
      documentKindMismatch({
        ...document,
        requiredKindAtUpload: "NON_COMPETITIVE",
        inspection: { recognizedKind: "NON_COMPETITIVE", anomalies: [] },
      }),
    ).toBe(false);
  });
});
