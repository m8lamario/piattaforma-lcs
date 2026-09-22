import type { MediaDecision } from "@/features/consents/domain/pack";
import { isMediaComplete } from "@/features/consents/domain/pack";

export const REQUIREMENT_CODES = [
  "PERSONAL_DATA",
  "GUARDIAN_IF_MINOR",
  "MEDICAL_CERT",
  "PRIVACY",
  "MEDIA_RELEASE",
  "PAYMENT",
] as const;

export type RequirementCode = (typeof REQUIREMENT_CODES)[number];

export type RequirementAudience = "ALL" | "MINOR" | "ADULT";

export type EditionRequirement = {
  code: RequirementCode;
  required: boolean;
  appliesTo: RequirementAudience;
};

export const DEFAULT_EDITION_REQUIREMENTS: EditionRequirement[] = [
  { code: "PERSONAL_DATA", required: true, appliesTo: "ALL" },
  { code: "GUARDIAN_IF_MINOR", required: true, appliesTo: "MINOR" },
  { code: "MEDICAL_CERT", required: true, appliesTo: "ALL" },
  { code: "PRIVACY", required: true, appliesTo: "ALL" },
  { code: "MEDIA_RELEASE", required: false, appliesTo: "ALL" },
  { code: "PAYMENT", required: true, appliesTo: "ALL" },
];

export type ChecklistItemStatus =
  | "complete"
  | "todo"
  | "attention"
  | "not_applicable";

export type MedicalEvidence =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export type PaymentEvidence = {
  mode: "PLAYER" | "TEAM" | "BOTH";
  playerSucceeded: boolean;
  teamSucceeded: boolean;
};

export type RegistrationEvidence = {
  hasAccount: boolean;
  hasPersonalData: boolean;
  isMinor: boolean;
  hasGuardian: boolean;
  medicalStatus: MedicalEvidence;
  privacyAccepted: boolean;
  mediaDecision: MediaDecision;
  payment: PaymentEvidence;
};

export type RegistrationStatus =
  | "INVITED"
  | "ACCOUNT_CREATED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "PAYMENT_PENDING"
  | "APPROVED"
  | "WITHDRAWN"
  | "REMOVED";

export type ChecklistItem = {
  code: RequirementCode;
  status: ChecklistItemStatus;
  required: boolean;
};

function applies(requirement: EditionRequirement, isMinorPlayer: boolean) {
  if (requirement.appliesTo === "ALL") return true;
  if (requirement.appliesTo === "MINOR") return isMinorPlayer;
  return !isMinorPlayer;
}

export function isPaymentCovered(payment: PaymentEvidence) {
  if (payment.teamSucceeded) return true;
  if (payment.mode === "TEAM") return false;
  return payment.playerSucceeded;
}

function statusFor(
  requirement: EditionRequirement,
  evidence: RegistrationEvidence,
): ChecklistItemStatus {
  if (!applies(requirement, evidence.isMinor)) return "not_applicable";

  switch (requirement.code) {
    case "PERSONAL_DATA":
      return evidence.hasPersonalData ? "complete" : "todo";
    case "GUARDIAN_IF_MINOR":
      return evidence.hasGuardian ? "complete" : "todo";
    case "MEDICAL_CERT":
      if (evidence.medicalStatus === "approved") return "complete";
      if (
        evidence.medicalStatus === "rejected" ||
        evidence.medicalStatus === "expired" ||
        evidence.medicalStatus === "pending"
      ) {
        return "attention";
      }
      return "todo";
    case "PRIVACY":
      return evidence.privacyAccepted ? "complete" : "todo";
    case "MEDIA_RELEASE":
      return isMediaComplete(requirement.required, evidence.mediaDecision) ? "complete" : "todo";
    case "PAYMENT":
      return isPaymentCovered(evidence.payment) ? "complete" : "todo";
  }
}

export function projectChecklist(
  requirements: EditionRequirement[],
  evidence: RegistrationEvidence,
): ChecklistItem[] {
  return requirements.map((requirement) => ({
    code: requirement.code,
    required: requirement.required && applies(requirement, evidence.isMinor),
    status: statusFor(requirement, evidence),
  }));
}

export function isBlocking(item: ChecklistItem) {
  if (item.status === "not_applicable") return false;
  if (!item.required) return false;
  return item.status !== "complete";
}

export function isTerminalRegistrationStatus(status: string) {
  return status === "WITHDRAWN" || status === "REMOVED";
}

export function isInactiveRegistrationStatus(status: string) {
  return status === "WITHDRAWN" || status === "REMOVED";
}

export function projectRegistrationStatus(
  evidence: RegistrationEvidence,
  checklist: ChecklistItem[],
): RegistrationStatus {
  if (!evidence.hasAccount) return "INVITED";
  if (!evidence.hasPersonalData) return "ACCOUNT_CREATED";

  if (evidence.medicalStatus === "rejected" || evidence.medicalStatus === "expired") {
    return "CHANGES_REQUESTED";
  }

  const blocking = checklist.filter(isBlocking);
  const payment = blocking.find((item) => item.code === "PAYMENT");
  const others = blocking.filter((item) => item.code !== "PAYMENT");

  if (others.length === 0 && payment) return "PAYMENT_PENDING";
  if (evidence.medicalStatus === "pending" && others.every((item) => item.code === "MEDICAL_CERT")) {
    return "PENDING_REVIEW";
  }
  if (others.length > 0) return "IN_PROGRESS";
  return "APPROVED";
}
