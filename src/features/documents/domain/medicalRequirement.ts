import { it } from "@/shared/i18n/it";

export const MEDICAL_CERTIFICATE_KINDS = ["COMPETITIVE", "NON_COMPETITIVE"] as const;

export type MedicalCertificateKind = (typeof MEDICAL_CERTIFICATE_KINDS)[number];

export const DEFAULT_MEDICAL_CERTIFICATE_KIND: MedicalCertificateKind = "COMPETITIVE";

export const OPEN_DOCUMENT_STATUSES = [
  "UPLOADED",
  "PROCESSING",
  "PREVALIDATED",
  "PENDING_REVIEW",
] as const;

export const REVIEWABLE_DOCUMENT_STATUSES = ["PENDING_REVIEW", "PREVALIDATED"] as const;

export const QUEUE_DOCUMENT_STATUSES = REVIEWABLE_DOCUMENT_STATUSES;

export type OpenDocumentStatus = (typeof OPEN_DOCUMENT_STATUSES)[number];
export type ReviewableDocumentStatus = (typeof REVIEWABLE_DOCUMENT_STATUSES)[number];

export function isMedicalCertificateKind(value: string): value is MedicalCertificateKind {
  return (MEDICAL_CERTIFICATE_KINDS as readonly string[]).includes(value);
}

export function parseMedicalCertificateKind(
  value: string | null | undefined,
): MedicalCertificateKind {
  return value && isMedicalCertificateKind(value) ? value : DEFAULT_MEDICAL_CERTIFICATE_KIND;
}

export function isOpenDocumentStatus(status: string): status is OpenDocumentStatus {
  return (OPEN_DOCUMENT_STATUSES as readonly string[]).includes(status);
}

export function isReviewableDocumentStatus(status: string): status is ReviewableDocumentStatus {
  return (REVIEWABLE_DOCUMENT_STATUSES as readonly string[]).includes(status);
}

export function approvalReasonCode(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? "AGONISTIC_FOOTBALL_CERTIFICATE" : "NON_COMPETITIVE_SPORT_CERTIFICATE";
}

export function medicalKindLabel(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.medicalKindCOMPETITIVE : it.medicalKindNON_COMPETITIVE;
}

export function medicalBannerCopy(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.medicalBannerCOMPETITIVE : it.medicalBannerNON_COMPETITIVE;
}

export function medicalStepLead(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.stepCertificatoLead : it.stepCertificatoLeadNON_COMPETITIVE;
}

export function medicalStepTip(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.stepCertificatoTip : it.stepCertificatoTipNON_COMPETITIVE;
}

export function medicalNoneCopy(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.medicalNone : it.medicalNoneNON_COMPETITIVE;
}

export function medicalCopyNotice(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.medicalCopyNotice : it.medicalCopyNoticeNON_COMPETITIVE;
}

export function medicalStepBox(kind: MedicalCertificateKind, deadlineLabel: string | null) {
  if (deadlineLabel) {
    const template = kind === "COMPETITIVE" ? it.medicalStepBox : it.medicalStepBoxNON_COMPETITIVE;
    return template.replace("{date}", deadlineLabel);
  }
  return kind === "COMPETITIVE" ? it.medicalStepBoxNoDate : it.medicalStepBoxNoDateNON_COMPETITIVE;
}

export function medicalAdminConfirm(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.adminConfirmCOMPETITIVE : it.adminConfirmNON_COMPETITIVE;
}

export function medicalHealthConsentText(code: "M3" | "G4", kind: MedicalCertificateKind) {
  if (kind === "NON_COMPETITIVE") {
    return code === "M3" ? it.boxM3NON_COMPETITIVE : it.boxG4NON_COMPETITIVE;
  }
  return code === "M3" ? it.boxM3 : it.boxG4;
}

export function consentClauseText(code: string, kind: MedicalCertificateKind) {
  if (code === "M3" || code === "G4") {
    return medicalHealthConsentText(code, kind);
  }
  return it[`box${code}` as keyof typeof it] as string;
}

export function healthConsentLabels(kind: MedicalCertificateKind): Partial<Record<string, string>> {
  if (kind === "COMPETITIVE") return {};
  return {
    M3: medicalHealthConsentText("M3", kind),
    G4: medicalHealthConsentText("G4", kind),
  };
}

export function medicalDeadlineNotifyBody(kind: MedicalCertificateKind) {
  return kind === "COMPETITIVE" ? it.notifyMedicalDeadlineBodyCOMPETITIVE : it.notifyMedicalDeadlineBodyNON_COMPETITIVE;
}
