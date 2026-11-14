import type { EmailStatus } from "./status";

export const USER_EMAIL_RESEND_MAX = 3;
export const USER_EMAIL_RESEND_COOLDOWN_SECONDS = 60;
export const USER_EMAIL_QUEUED_STALE_MS = 30_000;
export const USER_EMAIL_RESEND_IDEMPOTENCY_PREFIX = "user-resend:";
export const PASSWORD_RESET_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const USER_EMAIL_DELIVERY_STATES = [
  "not_sent",
  "sending",
  "accepted",
  "delivered",
  "undeliverable",
  "technical_error",
] as const;

export type UserEmailDeliveryState = (typeof USER_EMAIL_DELIVERY_STATES)[number];

export type UserEmailResendReason = "cooldown" | "exhausted" | "undeliverable" | "sending" | "blocked";

export type UserEmailResendDecision =
  | { allow: true }
  | { allow: false; reason: UserEmailResendReason };

export type UserEmailMessageSnapshot = {
  status: string;
  queuedAt: Date;
  idempotencyKey: string;
};

export function isUserEmailResendKey(idempotencyKey: string) {
  return idempotencyKey.startsWith(USER_EMAIL_RESEND_IDEMPOTENCY_PREFIX);
}

export function userEmailResendIdempotencyKey(rest: string) {
  return `${USER_EMAIL_RESEND_IDEMPOTENCY_PREFIX}${rest}`;
}

export function remainingUserEmailResends(
  userResendCount: number,
  max = USER_EMAIL_RESEND_MAX,
) {
  return Math.max(0, max - Math.max(0, userResendCount));
}

export function userEmailDeliveryState(
  row: { status: string; queuedAt: Date } | null,
  now = new Date(),
  queuedStaleMs = USER_EMAIL_QUEUED_STALE_MS,
): UserEmailDeliveryState {
  if (!row) return "not_sent";
  switch (row.status as EmailStatus | string) {
    case "QUEUED":
      return now.getTime() - row.queuedAt.getTime() > queuedStaleMs ? "not_sent" : "sending";
    case "SENT":
    case "DELIVERY_DELAYED":
      return "accepted";
    case "DELIVERED":
      return "delivered";
    case "BOUNCED":
      return "undeliverable";
    case "FAILED":
    case "COMPLAINED":
      return "technical_error";
    default:
      return "not_sent";
  }
}

export function resendCooldownUntil(
  lastQueuedAt: Date | null,
  now = new Date(),
  cooldownSeconds = USER_EMAIL_RESEND_COOLDOWN_SECONDS,
) {
  if (!lastQueuedAt) return null;
  const until = new Date(lastQueuedAt.getTime() + cooldownSeconds * 1000);
  return until.getTime() > now.getTime() ? until : null;
}

export function decideUserEmailResend(input: {
  userResendCount: number;
  lastState: UserEmailDeliveryState;
  lastStatus?: string | null;
  lastQueuedAt: Date | null;
  now?: Date;
  max?: number;
  cooldownSeconds?: number;
}): UserEmailResendDecision {
  const now = input.now ?? new Date();
  if (input.lastState === "sending") return { allow: false, reason: "sending" };
  if (input.lastState === "undeliverable" || input.lastStatus === "COMPLAINED") {
    return { allow: false, reason: input.lastState === "undeliverable" ? "undeliverable" : "blocked" };
  }
  if (remainingUserEmailResends(input.userResendCount, input.max) <= 0) {
    return { allow: false, reason: "exhausted" };
  }
  if (resendCooldownUntil(input.lastQueuedAt, now, input.cooldownSeconds)) {
    return { allow: false, reason: "cooldown" };
  }
  return { allow: true };
}

export function consecutiveTechnicalErrors(rows: Array<{ status: string }>) {
  if (rows.length < 2) return false;
  const last = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  return (
    userEmailDeliveryState({ status: last.status, queuedAt: new Date() }) === "technical_error" &&
    userEmailDeliveryState({ status: previous.status, queuedAt: new Date() }) === "technical_error"
  );
}

export function shouldContactEmailSupport(input: {
  remainingResends: number;
  lastState: UserEmailDeliveryState;
  lastStatus?: string | null;
  consecutiveTechnical: boolean;
}) {
  return (
    input.remainingResends <= 0 ||
    input.consecutiveTechnical ||
    input.lastStatus === "COMPLAINED" ||
    (input.lastState === "technical_error" && input.remainingResends <= 0)
  );
}

export function projectUserEmailDelivery(input: {
  rows: UserEmailMessageSnapshot[];
  now?: Date;
  max?: number;
  cooldownSeconds?: number;
}) {
  const now = input.now ?? new Date();
  const last = input.rows[input.rows.length - 1] ?? null;
  const userResendCount = input.rows.filter((row) => isUserEmailResendKey(row.idempotencyKey)).length;
  const lastState = userEmailDeliveryState(last, now);
  const remainingResends = remainingUserEmailResends(userResendCount, input.max);
  const decision = decideUserEmailResend({
    userResendCount,
    lastState,
    lastStatus: last?.status ?? null,
    lastQueuedAt: last?.queuedAt ?? null,
    now,
    max: input.max,
    cooldownSeconds: input.cooldownSeconds,
  });
  const consecutiveTechnical = consecutiveTechnicalErrors(input.rows);
  return {
    state: lastState,
    lastStatus: last?.status ?? null,
    lastQueuedAt: last?.queuedAt ?? null,
    totalSends: input.rows.length,
    userResendCount,
    remainingResends,
    resendAvailableAt: resendCooldownUntil(last?.queuedAt ?? null, now, input.cooldownSeconds),
    decision,
    contactSupport: shouldContactEmailSupport({
      remainingResends,
      lastState,
      lastStatus: last?.status ?? null,
      consecutiveTechnical,
    }),
  };
}

export function projectPasswordResetAttempts(input: {
  attempts: Array<{ createdAt: Date }>;
  now?: Date;
  max?: number;
  cooldownSeconds?: number;
}) {
  const now = input.now ?? new Date();
  const last = input.attempts[input.attempts.length - 1] ?? null;
  const userResendCount = Math.max(0, input.attempts.length - 1);
  const remainingResends = remainingUserEmailResends(userResendCount, input.max);
  const lastQueuedAt = last?.createdAt ?? null;
  const cooldownUntil = resendCooldownUntil(lastQueuedAt, now, input.cooldownSeconds);
  let decision: UserEmailResendDecision = { allow: true };
  if (remainingResends <= 0) decision = { allow: false, reason: "exhausted" };
  else if (cooldownUntil) decision = { allow: false, reason: "cooldown" };
  return {
    remainingResends,
    userResendCount,
    totalSends: input.attempts.length,
    resendAvailableAt: cooldownUntil,
    decision,
    contactSupport: remainingResends <= 0,
  };
}
