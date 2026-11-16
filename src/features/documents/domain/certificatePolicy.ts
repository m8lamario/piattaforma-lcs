import { NON_COMPETITIVE_VALIDITY_MONTHS } from "@/shared/config/app";
import type { MedicalCertificateKind } from "./medicalRequirement";

/**
 * Regole operative di pre-validazione. Non sono un parere medico-legale
 * e non certificano la validità del documento (OD-005).
 */
export const INSPECTION_ANOMALIES = [
  "UNREADABLE",
  "INCOMPLETE",
  "KIND_MISMATCH",
  "NAME_MISMATCH",
  "EXPIRY_UNREADABLE",
  "APPARENTLY_EXPIRED",
  "UNCLASSIFIED",
  "INSPECTOR_FAILED",
] as const;

export type InspectionAnomaly = (typeof INSPECTION_ANOMALIES)[number];

export type NameMatchResult = "MATCH" | "MISMATCH" | "UNKNOWN";
export type StampPresence = "PRESENT" | "ABSENT" | "UNKNOWN";

export type CertificateInspectionInput = {
  text: string | null;
  requiredKind: MedicalCertificateKind;
  playerFirstName: string;
  playerLastName: string;
  now?: Date;
  nonCompetitiveValidityMonths?: number;
  minTextChars?: number;
};

export type CertificateInspectionFacts = {
  recognizedKind: MedicalCertificateKind | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  nameMatch: NameMatchResult;
  stampPresence: StampPresence;
  anomalies: InspectionAnomaly[];
};

export const DEFAULT_MIN_CERTIFICATE_TEXT_CHARS = 40;

const NON_COMPETITIVE_HINTS = [
  "non agonistic",
  "non-agonistic",
  "attivita sportiva non agonistica",
  "pratica sportiva non agonistica",
  "idoneita alla pratica sportiva non agonistica",
  "idoneita sportiva non agonistica",
];

export const GENERIC_CERTIFICATE_HINTS = [
  "sana e robusta costituzione",
  "buona salute",
  "certificato generico",
];

const STAMP_HINTS = ["timbro", "firma", "sigillo", "dott.", "dott ", "medico sportivo", "struttura sanitaria"];

export function foldCertificateText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function detectCertificateKind(text: string): MedicalCertificateKind | null {
  const folded = foldCertificateText(text);
  if (NON_COMPETITIVE_HINTS.some((hint) => folded.includes(hint))) return "NON_COMPETITIVE";
  if (/(?<!non )agonistic/.test(folded)) return "COMPETITIVE";
  return null;
}

function detectStamp(text: string): StampPresence {
  const folded = foldCertificateText(text);
  return STAMP_HINTS.some((hint) => folded.includes(hint)) ? "PRESENT" : "ABSENT";
}

function foldNamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function matchPlayerName(text: string, firstName: string, lastName: string): NameMatchResult {
  const first = foldNamePart(firstName);
  const last = foldNamePart(lastName);
  if (!first || !last) return "UNKNOWN";
  const compact = foldNamePart(text);
  if (compact.includes(first) && compact.includes(last)) return "MATCH";
  return "MISMATCH";
}

type ParsedDate = { date: Date; index: number; raw: string };

function parseFoundDates(text: string): ParsedDate[] {
  const found: ParsedDate[] = [];
  const european = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g;
  for (const match of text.matchAll(european)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) continue;
    found.push({ date, index: match.index ?? 0, raw: match[0] });
  }
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  for (const match of text.matchAll(iso)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) continue;
    found.push({ date, index: match.index ?? 0, raw: match[0] });
  }
  found.sort((a, b) => a.index - b.index);
  return found;
}

function contextAround(text: string, index: number, span = 40) {
  return foldCertificateText(text.slice(Math.max(0, index - span), Math.min(text.length, index + span)));
}

export function addUtcMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const end = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, end)));
}

function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function extractCertificateDates(text: string): { issuedAt: Date | null; expiresAt: Date | null } {
  const dates = parseFoundDates(text);
  if (dates.length === 0) return { issuedAt: null, expiresAt: null };

  const issuedHits: Date[] = [];
  const expiryHits: Date[] = [];
  const unlabeled: Date[] = [];
  for (const entry of dates) {
    const around = contextAround(text, entry.index);
    const expiryHint = /scadenz|valido (fino|sino)|scade|validita/.test(around);
    const issuedHint = /rilascio|rilasciat|emissione|emesso|data visita/.test(around);
    if (expiryHint && !issuedHint) expiryHits.push(entry.date);
    else if (issuedHint && !expiryHint) issuedHits.push(entry.date);
    else unlabeled.push(entry.date);
  }

  let issuedAt: Date | null = issuedHits[0] ?? null;
  let expiresAt: Date | null = expiryHits[0] ?? null;

  if (!issuedAt && !expiresAt) {
    if (dates.length === 1) return { issuedAt: null, expiresAt: null };
    const ordered = [...dates].sort((a, b) => a.date.getTime() - b.date.getTime());
    issuedAt = ordered[0]?.date ?? null;
    expiresAt = ordered[ordered.length - 1]?.date ?? null;
    return { issuedAt, expiresAt };
  }

  if (!issuedAt) issuedAt = unlabeled[0] ?? null;
  if (!expiresAt) {
    const leftover = unlabeled.filter((date) => date.getTime() !== issuedAt?.getTime());
    expiresAt = leftover[leftover.length - 1] ?? unlabeled[unlabeled.length - 1] ?? null;
    if (expiresAt && issuedAt && expiresAt.getTime() === issuedAt.getTime()) expiresAt = null;
  }

  return { issuedAt, expiresAt };
}

export function inspectCertificateText(input: CertificateInspectionInput): CertificateInspectionFacts {
  const now = input.now ?? new Date();
  const minChars = input.minTextChars ?? DEFAULT_MIN_CERTIFICATE_TEXT_CHARS;
  const months = input.nonCompetitiveValidityMonths ?? NON_COMPETITIVE_VALIDITY_MONTHS;
  const trimmed = input.text?.replace(/\s+/g, " ").trim() ?? "";

  if (!trimmed) {
    return {
      recognizedKind: null,
      issuedAt: null,
      expiresAt: null,
      nameMatch: "UNKNOWN",
      stampPresence: "UNKNOWN",
      anomalies: ["UNREADABLE"],
    };
  }

  if (trimmed.length < minChars) {
    return {
      recognizedKind: null,
      issuedAt: null,
      expiresAt: null,
      nameMatch: "UNKNOWN",
      stampPresence: "UNKNOWN",
      anomalies: ["INCOMPLETE"],
    };
  }

  const recognizedKind = detectCertificateKind(trimmed);
  const { issuedAt, expiresAt } = extractCertificateDates(trimmed);
  const nameMatch = matchPlayerName(trimmed, input.playerFirstName, input.playerLastName);
  const stampPresence = detectStamp(trimmed);
  const anomalies: InspectionAnomaly[] = [];

  if (nameMatch !== "MATCH") anomalies.push("NAME_MISMATCH");
  if (stampPresence !== "PRESENT") anomalies.push("INCOMPLETE");

  if (recognizedKind && recognizedKind !== input.requiredKind) {
    anomalies.push("KIND_MISMATCH");
  } else if (!recognizedKind) {
    anomalies.push("UNCLASSIFIED");
  }

  if (!issuedAt || !expiresAt) {
    anomalies.push("EXPIRY_UNREADABLE");
  }

  const proposedExpiry = proposedCertificateExpiry({
    requiredKind: input.requiredKind,
    issuedAt,
    expiresAt,
    nonCompetitiveValidityMonths: months,
  });
  if (proposedExpiry && startOfUtcDay(proposedExpiry) <= startOfUtcDay(now)) {
    anomalies.push("APPARENTLY_EXPIRED");
  }

  return {
    recognizedKind,
    issuedAt,
    expiresAt,
    nameMatch,
    stampPresence,
    anomalies: uniqueAnomalies(anomalies),
  };
}

/** Validità proposta al revisore. Per il non agonistico è la data più vicina tra scadenza scritta e rilascio + N mesi. */
export function proposedCertificateExpiry(input: {
  requiredKind: MedicalCertificateKind;
  issuedAt: Date | null;
  expiresAt: Date | null;
  nonCompetitiveValidityMonths?: number;
}) {
  const months = input.nonCompetitiveValidityMonths ?? NON_COMPETITIVE_VALIDITY_MONTHS;
  if (input.requiredKind !== "NON_COMPETITIVE" || !input.issuedAt) return input.expiresAt;
  const cap = addUtcMonths(input.issuedAt, months);
  if (!input.expiresAt) return cap;
  return cap.getTime() < input.expiresAt.getTime() ? cap : input.expiresAt;
}

export function uniqueAnomalies(anomalies: InspectionAnomaly[]) {
  return [...new Set(anomalies)];
}

export function statusFromAnomalies(anomalies: readonly InspectionAnomaly[]) {
  return anomalies.length === 0 ? ("PREVALIDATED" as const) : ("PENDING_REVIEW" as const);
}

export function realignInspectionAnomalies(input: {
  requiredKindNow: MedicalCertificateKind;
  recognizedKind: MedicalCertificateKind | null;
  anomalies: readonly InspectionAnomaly[];
}) {
  const next: InspectionAnomaly[] = input.anomalies.filter((code) => code !== "KIND_MISMATCH");
  if (input.recognizedKind && input.recognizedKind !== input.requiredKindNow) {
    next.push("KIND_MISMATCH");
  }
  return uniqueAnomalies(next);
}
