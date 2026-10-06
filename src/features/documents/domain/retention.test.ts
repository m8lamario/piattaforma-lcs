import { describe, expect, it } from "vitest";
import { isMedicalBlobDueForPurge, isMedicalExpired } from "./retention";

describe("medical retention", () => {
  const now = new Date("2026-10-06T12:00:00Z");

  it("purga i blob sostituiti e rifiutati", () => {
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: null,
        status: "REPLACED",
        registrationStatus: "IN_PROGRESS",
        editionEndsAt: new Date("2027-01-01"),
        now,
      }),
    ).toBe(true);
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: null,
        status: "REJECTED",
        registrationStatus: "IN_PROGRESS",
        editionEndsAt: new Date("2027-01-01"),
        now,
      }),
    ).toBe(true);
  });

  it("purga al ritiro e dopo 90 giorni da endsAt", () => {
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: null,
        status: "APPROVED",
        registrationStatus: "WITHDRAWN",
        editionEndsAt: new Date("2027-01-01"),
        now,
      }),
    ).toBe(true);
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: null,
        status: "APPROVED",
        registrationStatus: "APPROVED",
        editionEndsAt: new Date("2026-06-01"),
        now,
        retentionDays: 90,
      }),
    ).toBe(true);
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: null,
        status: "APPROVED",
        registrationStatus: "APPROVED",
        editionEndsAt: new Date("2026-09-01"),
        now,
        retentionDays: 90,
      }),
    ).toBe(false);
  });

  it("non tocca un blob già purgato", () => {
    expect(
      isMedicalBlobDueForPurge({
        blobPurgedAt: now,
        status: "REPLACED",
        registrationStatus: "WITHDRAWN",
        editionEndsAt: now,
        now,
      }),
    ).toBe(false);
  });

  it("riconosce la scadenza del certificato", () => {
    expect(isMedicalExpired(new Date("2026-10-05T00:00:00Z"), now)).toBe(true);
    expect(isMedicalExpired(new Date("2026-10-07T00:00:00Z"), now)).toBe(false);
  });
});
