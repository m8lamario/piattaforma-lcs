import { it } from "@/shared/i18n/it";
import type { StatusTone } from "@/shared/ui/StatusChip";

export function emailStatusLabel(status: string) {
  const key = `emailStatus${status}` as keyof typeof it;
  const value = it[key];
  return typeof value === "string" ? value : status;
}

export function emailStatusTone(status: string): StatusTone {
  if (status === "DELIVERED") return "complete";
  if (status === "SENT" || status === "QUEUED") return "attention";
  if (status === "DELIVERY_DELAYED") return "attention";
  if (status === "FAILED" || status === "BOUNCED" || status === "COMPLAINED") return "danger";
  return "neutral";
}

export function emailPurposeLabel(purpose: string) {
  const labels: Record<string, string> = {
    "player-invite": it.emailPurposeplayer_invite,
    "staff-invite": it.emailPurposestaff_invite,
    "password-reset": it.emailPurposepassword_reset,
    REGISTRATION_RECEIVED: it.emailPurposeREGISTRATION_RECEIVED,
    REGISTRATION_APPROVED: it.emailPurposeREGISTRATION_APPROVED,
    DOCUMENT_APPROVED: it.emailPurposeDOCUMENT_APPROVED,
    DOCUMENT_REJECTED: it.emailPurposeDOCUMENT_REJECTED,
    CONSENT_C1: it.emailPurposeCONSENT_C1,
    CONSENT_MARKETING_OPTIN: it.emailPurposeCONSENT_MARKETING_OPTIN,
    EMAIL_VERIFY: it.emailPurposeEMAIL_VERIFY,
    GUARDIAN_AUTHORIZE: it.emailPurposeGUARDIAN_AUTHORIZE,
    GUARDIAN_AUTHORIZED: it.emailPurposeGUARDIAN_AUTHORIZED,
    GUARDIAN_REFUSED: it.emailPurposeGUARDIAN_REFUSED,
    MEDIA_REVOKE_INTERNAL: it.emailPurposeMEDIA_REVOKE_INTERNAL,
    PAYMENT_SUCCEEDED: it.emailPurposePAYMENT_SUCCEEDED,
    REGISTRATION_WITHDRAWN: it.emailPurposeREGISTRATION_WITHDRAWN,
    REGISTRATION_REMINDER: it.emailPurposeREGISTRATION_REMINDER,
    LEGAL_VERSION_NOTICE: it.emailPurposeLEGAL_VERSION_NOTICE,
    MANUAL: it.emailPurposeMANUAL,
  };
  return labels[purpose] ?? purpose;
}

export function formatEmailWhen(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toISOString().replace("T", " ").slice(0, 16);
}
