import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const EMAIL_VERIFY_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFY_RESEND_SECONDS = 60;

export function emailVerifyIdentifier(email: string) {
  return `email-verify:${email.trim().toLowerCase()}`;
}

export function createEmailVerifyCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeEmailVerifyCode(raw: string) {
  const compact = raw.trim().replace(/[\s-]/g, "");
  return /^\d{6}$/.test(compact) ? compact : null;
}

export function hashEmailVerifyCode(code: string, pepper: string) {
  return createHmac("sha256", pepper).update(`email-verify-code:${code}`).digest("hex");
}

export function emailCodeHashesMatch(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function emailVerifyResendDelayMs(
  createdAt: Date,
  now = new Date(),
  cooldownSeconds = EMAIL_VERIFY_RESEND_SECONDS,
) {
  return Math.max(0, createdAt.getTime() + cooldownSeconds * 1000 - now.getTime());
}

export type EmailCodeJudgement = "invalid" | "expired" | "locked" | "mismatch" | "ok";

export function judgeEmailVerifyCode(input: {
  record: { expiresAt: Date; attempts: number } | null;
  matches: boolean;
  now?: Date;
  maxAttempts?: number;
}): EmailCodeJudgement {
  const now = input.now ?? new Date();
  const maxAttempts = input.maxAttempts ?? EMAIL_VERIFY_MAX_ATTEMPTS;
  if (!input.record) return "invalid";
  if (input.record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (input.record.attempts >= maxAttempts) return "locked";
  if (!input.matches) {
    return input.record.attempts + 1 >= maxAttempts ? "locked" : "mismatch";
  }
  return "ok";
}

export function maskEmailAddress(email: string) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return "•••";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const hidden = "•".repeat(Math.min(4, Math.max(local.length - 1, 1)));
  return `${local.slice(0, 1)}${hidden}@${domain}`;
}

export function safeInternalPath(value: string, fallback = "/area") {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://") || /[\u0000-\u001f]/.test(trimmed)) return fallback;
  if (/^\/\s*%2f/i.test(trimmed)) return fallback;
  return trimmed;
}

export function emailVerificationPath(nextPath: string) {
  const next = safeInternalPath(nextPath);
  if (next === "/verifica-email" || next.startsWith("/verifica-email?") || next.startsWith("/verifica-email#")) {
    return next;
  }
  return `/verifica-email?next=${encodeURIComponent(next)}`;
}

export function pathAfterEmailVerification(nextPath: string | null | undefined) {
  const next = safeInternalPath(nextPath ?? "");
  if (next === "/verifica-email" || next.startsWith("/verifica-email?") || next.startsWith("/verifica-email#")) {
    return "/area";
  }
  return next;
}
