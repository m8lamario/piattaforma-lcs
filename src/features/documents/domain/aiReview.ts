import { NON_COMPETITIVE_VALIDITY_MONTHS } from "@/shared/config/app";
import { parseDateOnly } from "@/features/players/domain/dates";
import { addUtcMonths } from "./certificatePolicy";
import { isReviewableDocumentStatus, type MedicalCertificateKind } from "./medicalRequirement";

export const AI_REVIEW_TEXT_MAX = 500;
export const AI_LIST_DEFAULT_LIMIT = 20;
export const AI_LIST_MAX_LIMIT = 50;

export const AI_ACTIONABLE_STATES = ["NONE"] as const;
export type AiReviewState = "NONE" | "FLAGGED" | "APPROVED" | "RETURNED";

export type AiCertificateKindLabel = "agonistico" | "non agonistico";

export type AiListCursor = {
  uploadedAt: Date;
  id: string;
};

export type AiActionableDocument = {
  typeCode: string;
  status: string;
  aiReviewState: string;
  blobPurgedAt: Date | null;
};

export function isAiReviewState(value: string): value is AiReviewState {
  return value === "NONE" || value === "FLAGGED" || value === "APPROVED" || value === "RETURNED";
}

export function isAiActionable(document: AiActionableDocument): boolean {
  return (
    document.typeCode === "MEDICAL_CERTIFICATE" &&
    isReviewableDocumentStatus(document.status) &&
    document.aiReviewState === "NONE" &&
    document.blobPurgedAt === null
  );
}

export function aiApproveBlockedByKindChange(
  requiredKindAtUpload: MedicalCertificateKind,
  editionKind: MedicalCertificateKind,
): boolean {
  return requiredKindAtUpload !== editionKind;
}

export function canRevokeAiApproval(document: { status: string; aiReviewState: string }): boolean {
  return document.status === "APPROVED" && document.aiReviewState === "APPROVED";
}

export function aiKindLabel(kind: MedicalCertificateKind): AiCertificateKindLabel {
  return kind === "COMPETITIVE" ? "agonistico" : "non agonistico";
}

/** Non agonistico: un anno dalla visita. Agonistico: la scadenza è scritta sul certificato. */
export function aiExpiryRule(kind: MedicalCertificateKind): "un_anno_dalla_visita" | "data_scritta_sul_certificato" {
  return kind === "NON_COMPETITIVE" ? "un_anno_dalla_visita" : "data_scritta_sul_certificato";
}

export function nonCompetitiveExpiryFromVisit(issuedAt: Date): Date {
  return addUtcMonths(issuedAt, NON_COMPETITIVE_VALIDITY_MONTHS);
}

export function clampAiListLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return AI_LIST_DEFAULT_LIMIT;
  const n = Math.trunc(limit);
  if (n < 1) return 1;
  if (n > AI_LIST_MAX_LIMIT) return AI_LIST_MAX_LIMIT;
  return n;
}

export function encodeAiListCursor(cursor: AiListCursor): string {
  return Buffer.from(`${cursor.uploadedAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url");
}

export function decodeAiListCursor(value: string): AiListCursor | null {
  if (!value.trim()) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.indexOf("|");
  if (sep < 1) return null;
  const iso = decoded.slice(0, sep);
  const id = decoded.slice(sep + 1);
  if (!id || !/^\d{4}-\d{2}-\d{2}T/.test(iso)) return null;
  const uploadedAt = new Date(iso);
  if (Number.isNaN(uploadedAt.getTime()) || uploadedAt.toISOString() !== iso) return null;
  return { uploadedAt, id };
}

export function parseAiReviewText(
  value: string,
): { ok: true; text: string } | { ok: false; reason: "empty" | "too_long" } {
  const text = value.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > AI_REVIEW_TEXT_MAX) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}

export function startOfUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function validateAiApproveDates(
  input: { issuedAt: Date; expiresAt: Date },
  now: Date = new Date(),
): "ok" | "expiry_required" | "issued_invalid" {
  const today = startOfUtcDay(now);
  if (input.expiresAt.getTime() <= today) return "expiry_required";
  if (input.issuedAt.getTime() > today) return "issued_invalid";
  if (input.issuedAt.getTime() > input.expiresAt.getTime()) return "issued_invalid";
  return "ok";
}

export function parseAiApproveDates(input: {
  dataRilascio: string;
  dataScadenza?: string;
  requiredKind: MedicalCertificateKind;
  now?: Date;
}):
  | { ok: true; issuedAt: Date; expiresAt: Date; expiryComputed: boolean }
  | { ok: false; reason: "expiry_required" | "issued_invalid" } {
  const issuedAt = parseDateOnly(input.dataRilascio);
  if (!issuedAt) return { ok: false, reason: "issued_invalid" };

  let expiresAt: Date | null = null;
  let expiryComputed = false;
  if (input.requiredKind === "NON_COMPETITIVE") {
    expiresAt = nonCompetitiveExpiryFromVisit(issuedAt);
    expiryComputed = true;
  } else {
    expiresAt = input.dataScadenza ? parseDateOnly(input.dataScadenza) : null;
    if (!expiresAt) return { ok: false, reason: "expiry_required" };
  }

  const check = validateAiApproveDates({ issuedAt, expiresAt }, input.now);
  if (check !== "ok") return { ok: false, reason: check };
  return { ok: true, issuedAt, expiresAt, expiryComputed };
}

export function auditTextSnippet(text: string): string {
  return text.slice(0, AI_REVIEW_TEXT_MAX);
}
