import { describe, expect, it } from "vitest";
import { medicalEvidenceFromStatus, realignOpenDocument } from "./inspection";

describe("evidenza medica da stato documento", () => {
  it("PROCESSING e PREVALIDATED restano in attesa, non idonei", () => {
    expect(medicalEvidenceFromStatus("PROCESSING")).toBe("pending");
    expect(medicalEvidenceFromStatus("PREVALIDATED")).toBe("pending");
    expect(medicalEvidenceFromStatus("UPLOADED")).toBe("pending");
    expect(medicalEvidenceFromStatus("PENDING_REVIEW")).toBe("pending");
    expect(medicalEvidenceFromStatus("APPROVED", new Date("2099-01-01"))).toBe("approved");
    expect(medicalEvidenceFromStatus("UNKNOWN")).toBe("none");
  });
});

describe("realineamento documenti aperti", () => {
  it("non tocca APPROVED, REJECTED, EXPIRED, REPLACED", () => {
    for (const status of ["APPROVED", "REJECTED", "EXPIRED", "REPLACED"] as const) {
      const next = realignOpenDocument({
        status,
        requiredKindNow: "NON_COMPETITIVE",
        recognizedKind: "COMPETITIVE",
        anomalies: [],
      });
      expect(next.status).toBe(status);
    }
  });
});
