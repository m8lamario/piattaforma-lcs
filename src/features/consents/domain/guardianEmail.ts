import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";

export type GuardianEmailNoticeKind = "primary" | "secondary";
export type GuardianEmailNoticeReason = "undeliverable" | "check_address";

export type GuardianEmailNotice = {
  kind: GuardianEmailNoticeKind;
  email: string;
  tone: "danger" | "warning";
  reason: GuardianEmailNoticeReason;
};

export type GuardianEmailContact = {
  email: string;
  open: boolean;
  delivery: UserEmailDeliveryState | null;
};

function noticeFor(kind: GuardianEmailNoticeKind, contact: GuardianEmailContact | null | undefined): GuardianEmailNotice | null {
  const email = contact?.email.trim() ?? "";
  if (!contact || !contact.open || !email) return null;
  if (contact.delivery === "undeliverable") {
    return { kind, email, tone: "danger", reason: "undeliverable" };
  }
  if (contact.delivery === "delivered") return null;
  return { kind, email, tone: "warning", reason: "check_address" };
}

export function projectGuardianEmailNotices(input: {
  primary?: GuardianEmailContact | null;
  secondary?: GuardianEmailContact | null;
}): GuardianEmailNotice[] {
  return [noticeFor("primary", input.primary), noticeFor("secondary", input.secondary)].filter(
    (notice): notice is GuardianEmailNotice => notice !== null,
  );
}

export function hasUndeliverableGuardianEmail(notices: GuardianEmailNotice[]) {
  return notices.some((notice) => notice.reason === "undeliverable");
}
