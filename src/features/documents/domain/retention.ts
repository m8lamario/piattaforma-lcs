import { MEDICAL_RETENTION_DAYS } from "@/shared/config/app";

export function isMedicalBlobDueForPurge(input: {
  blobPurgedAt: Date | null;
  status: string;
  registrationStatus: string;
  editionEndsAt: Date | null;
  now?: Date;
  retentionDays?: number;
}) {
  if (input.blobPurgedAt) return false;
  const now = input.now ?? new Date();
  if (input.status === "REPLACED" || input.status === "REJECTED") return true;
  if (input.registrationStatus === "WITHDRAWN" || input.registrationStatus === "REMOVED") return true;
  if (input.status === "APPROVED" && input.editionEndsAt) {
    const deadline = input.editionEndsAt.getTime() + (input.retentionDays ?? MEDICAL_RETENTION_DAYS) * 24 * 60 * 60 * 1000;
    return now.getTime() >= deadline;
  }
  return false;
}

export function isMedicalExpired(expiresAt: Date | null, now = new Date()) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

export const MEDICAL_EXCESS_REASON = "Contenuto sanitario eccedente il certificato richiesto";
