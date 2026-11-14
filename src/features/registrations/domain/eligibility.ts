import { MEDICAL_UPLOAD_LEAD_DAYS } from "@/shared/config/app";
import type { MedicalEvidence, ParticipantCategory } from "./requirements";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SportEligibilityReason =
  | "staff"
  | "eligible"
  | "missing"
  | "pending"
  | "rejected"
  | "expired"
  | "deadline"
  | "starts_unknown";

export type SportEligibility = {
  eligible: boolean;
  reason: SportEligibilityReason;
  uploadDeadline: Date | null;
};

export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function medicalUploadDeadline(
  startsAt: Date | null | undefined,
  leadDays = MEDICAL_UPLOAD_LEAD_DAYS,
) {
  if (!startsAt) return null;
  return new Date(startsAt.getTime() - leadDays * DAY_MS);
}

export function medicalDeadlinePassed(uploadDeadline: Date | null, now = new Date()) {
  if (!uploadDeadline) return false;
  return startOfUtcDay(now).getTime() >= startOfUtcDay(uploadDeadline).getTime();
}

export function medicalCertificateCoversStart(input: {
  expiresAt: Date | null | undefined;
  startsAt: Date | null | undefined;
  now?: Date;
}) {
  if (!input.expiresAt) return false;
  if (input.startsAt) return input.expiresAt.getTime() > input.startsAt.getTime();
  return input.expiresAt.getTime() > (input.now ?? new Date()).getTime();
}

export function projectSportEligibility(input: {
  category: ParticipantCategory;
  medicalStatus: MedicalEvidence;
  medicalExpiresAt?: Date | null;
  hasFile?: boolean;
  startsAt?: Date | null;
  now?: Date;
  leadDays?: number;
}): SportEligibility {
  const now = input.now ?? new Date();
  const uploadDeadline = medicalUploadDeadline(input.startsAt ?? null, input.leadDays);
  if (input.category === "STAFF") {
    return { eligible: true, reason: "staff", uploadDeadline };
  }

  if (input.medicalStatus === "approved") {
    const covers = medicalCertificateCoversStart({
      expiresAt: input.medicalExpiresAt ?? null,
      startsAt: input.startsAt ?? null,
      now,
    });
    if (input.hasFile !== false && covers) {
      return { eligible: true, reason: "eligible", uploadDeadline };
    }
    return { eligible: false, reason: "expired", uploadDeadline };
  }

  if (input.medicalStatus === "rejected") {
    return { eligible: false, reason: "rejected", uploadDeadline };
  }
  if (input.medicalStatus === "expired") {
    return { eligible: false, reason: "expired", uploadDeadline };
  }
  if (input.medicalStatus === "pending") {
    return { eligible: false, reason: "pending", uploadDeadline };
  }
  if (medicalDeadlinePassed(uploadDeadline, now)) {
    return { eligible: false, reason: "deadline", uploadDeadline };
  }
  if (!input.startsAt) {
    return { eligible: false, reason: "starts_unknown", uploadDeadline };
  }
  return { eligible: false, reason: "missing", uploadDeadline };
}

export function shouldRemindMedicalDeadline(input: {
  medicalStatus: MedicalEvidence;
  eligible: boolean;
}) {
  if (input.eligible) return false;
  return input.medicalStatus === "none" || input.medicalStatus === "rejected" || input.medicalStatus === "expired";
}

export function medicalDeadlineFingerprint(kind: "player" | "team", id: string, day: number) {
  return `${kind}:${id}:${day}`;
}

export function medicalDeadlineReminderDaysDue(input: {
  uploadDeadline: Date;
  now: Date;
  reminderDays: readonly number[];
}) {
  const today = startOfUtcDay(input.now).getTime();
  const deadline = startOfUtcDay(input.uploadDeadline).getTime();
  return input.reminderDays.filter((days) => {
    const reminderAt = deadline - days * DAY_MS;
    return today >= reminderAt;
  });
}
