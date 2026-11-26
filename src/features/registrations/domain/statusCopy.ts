import type { RegistrationStatus } from "@/features/registrations/domain/requirements";
import { it } from "@/shared/i18n/it";
import type { StatusTone } from "@/shared/ui/StatusChip";

const STATUS_COPY: Record<RegistrationStatus, string> = {
  INVITED: it.statusINVITED,
  ACCOUNT_CREATED: it.statusACCOUNT_CREATED,
  IN_PROGRESS: it.statusIN_PROGRESS,
  PENDING_REVIEW: it.statusPENDING_REVIEW,
  CHANGES_REQUESTED: it.statusCHANGES_REQUESTED,
  PAYMENT_PENDING: it.statusPAYMENT_PENDING,
  APPROVED: it.statusAPPROVED,
  WITHDRAWN: it.statusWITHDRAWN,
  REMOVED: it.statusREMOVED,
};

const STATUS_TONE: Record<RegistrationStatus, StatusTone> = {
  INVITED: "todo",
  ACCOUNT_CREATED: "todo",
  IN_PROGRESS: "attention",
  PENDING_REVIEW: "attention",
  CHANGES_REQUESTED: "attention",
  PAYMENT_PENDING: "attention",
  APPROVED: "complete",
  WITHDRAWN: "neutral",
  REMOVED: "neutral",
};

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return Object.hasOwn(STATUS_COPY, value);
}

export function registrationStatusEntries(): Array<[RegistrationStatus, string]> {
  return Object.entries(STATUS_COPY) as Array<[RegistrationStatus, string]>;
}

export function registrationStatusLabel(status: string) {
  return STATUS_COPY[status as RegistrationStatus] ?? status;
}

export function registrationStatusTone(status: string): StatusTone {
  return STATUS_TONE[status as RegistrationStatus] ?? "neutral";
}
