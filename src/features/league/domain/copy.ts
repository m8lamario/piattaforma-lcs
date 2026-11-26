import { registrationStatusLabel } from "@/features/registrations/domain/statusCopy";
import { it } from "@/shared/i18n/it";
import type { LeagueMedicalStatus, LeaguePaymentStatus, LeagueSchoolStatus } from "./status";

const MEDICAL_COPY: Record<LeagueMedicalStatus, string> = {
  none: it.leagueMedicalNone,
  pending: it.leagueMedicalPending,
  approved: it.leagueMedicalApproved,
  rejected: it.leagueMedicalRejected,
  expired: it.leagueMedicalExpired,
};

const PAYMENT_COPY: Record<LeaguePaymentStatus, string> = {
  paid: it.leaguePaymentPaid,
  pending: it.leaguePaymentPending,
  not_due: it.leaguePaymentNotDue,
};

const SCHOOL_COPY: Record<LeagueSchoolStatus, string> = {
  completed: it.leagueSchoolStatusCompleted,
  in_progress: it.leagueSchoolStatusProgress,
  issues: it.leagueSchoolStatusIssues,
  empty: it.leagueSchoolStatusEmpty,
};

export function leagueRegistrationLabel(status: string) {
  return registrationStatusLabel(status);
}

export function leagueMedicalLabel(status: LeagueMedicalStatus) {
  return MEDICAL_COPY[status];
}

export function leaguePaymentLabel(status: LeaguePaymentStatus) {
  return PAYMENT_COPY[status];
}

export function leagueSchoolStatusLabel(status: LeagueSchoolStatus) {
  return SCHOOL_COPY[status];
}

export function leagueCompletedAtLabel(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("it-IT");
}
