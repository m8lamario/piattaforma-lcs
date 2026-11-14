import { describe, expect, it } from "vitest";
import {
  medicalDeadlineFingerprint,
  medicalDeadlineReminderDaysDue,
  medicalUploadDeadline,
  projectSportEligibility,
  shouldRemindMedicalDeadline,
} from "./eligibility";

const STARTS = new Date("2026-09-01T00:00:00.000Z");

describe("idoneità sportiva", () => {
  it("un giocatore approvato senza certificato non è idoneo", () => {
    const result = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "none",
      startsAt: STARTS,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("missing");
  });

  it("a T-7 un certificato mancante lascia il giocatore non idoneo", () => {
    const result = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "none",
      startsAt: STARTS,
      now: new Date("2026-08-25T00:00:00.000Z"),
    });
    expect(result.uploadDeadline?.toISOString()).toBe("2026-08-25T00:00:00.000Z");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("deadline");
  });

  it("un certificato approvato con scadenza prima dell’inizio non è idoneo", () => {
    const result = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "approved",
      medicalExpiresAt: new Date("2026-08-31T00:00:00.000Z"),
      hasFile: true,
      startsAt: STARTS,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("lo staff è idoneo senza file", () => {
    const result = projectSportEligibility({
      category: "STAFF",
      medicalStatus: "none",
      hasFile: false,
      startsAt: STARTS,
    });
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("staff");
  });

  it("senza startsAt non inventa una data e chiede comunque il certificato approvato", () => {
    const missing = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "none",
      startsAt: null,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(missing.uploadDeadline).toBeNull();
    expect(missing.eligible).toBe(false);
    expect(missing.reason).toBe("starts_unknown");

    const approved = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "approved",
      medicalExpiresAt: new Date("2027-01-01T00:00:00.000Z"),
      hasFile: true,
      startsAt: null,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(approved.eligible).toBe(true);
    expect(medicalUploadDeadline(null)).toBeNull();
  });

  it("un certificato approvato valido rende idonei", () => {
    const result = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "approved",
      medicalExpiresAt: new Date("2026-12-01T00:00:00.000Z"),
      hasFile: true,
      startsAt: STARTS,
    });
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("i promemoria scaduti restano dovuti, senza inventare un giorno", () => {
    expect(
      medicalDeadlineReminderDaysDue({
        uploadDeadline: new Date("2026-08-25T00:00:00.000Z"),
        now: new Date("2026-08-18T12:00:00.000Z"),
        reminderDays: [14, 7, 1],
      }),
    ).toEqual([14, 7]);
  });

  it("un file in revisione resta in attesa anche a T-7 e non genera promemoria", () => {
    const result = projectSportEligibility({
      category: "PLAYER",
      medicalStatus: "pending",
      hasFile: true,
      startsAt: STARTS,
      now: new Date("2026-08-25T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("pending");
    expect(shouldRemindMedicalDeadline({ medicalStatus: "pending", eligible: false })).toBe(false);
    expect(shouldRemindMedicalDeadline({ medicalStatus: "none", eligible: false })).toBe(true);
    expect(shouldRemindMedicalDeadline({ medicalStatus: "rejected", eligible: false })).toBe(true);
    expect(shouldRemindMedicalDeadline({ medicalStatus: "expired", eligible: false })).toBe(true);
  });

  it("la seconda esecuzione riusa la stessa impronta di notifica", () => {
    expect(medicalDeadlineFingerprint("player", "reg-1", 14)).toBe("player:reg-1:14");
    expect(medicalDeadlineFingerprint("player", "reg-1", 14)).toBe(medicalDeadlineFingerprint("player", "reg-1", 14));
    expect(medicalDeadlineFingerprint("player", "reg-1", 7)).not.toBe(medicalDeadlineFingerprint("player", "reg-1", 14));
    expect(medicalDeadlineFingerprint("team", "team-1", 14)).not.toBe(medicalDeadlineFingerprint("player", "team-1", 14));
  });
});
