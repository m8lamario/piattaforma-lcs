import { randomBytes } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import {
  createEmailVerifyCode,
  emailCodeHashesMatch,
  emailVerifyIdentifier,
  emailVerifyResendDelayMs,
  hashEmailVerifyCode,
  judgeEmailVerifyCode,
  normalizeEmailVerifyCode,
} from "@/features/auth/domain/verify";
import { EMAIL_VERIFY_HOURS, appOrigin } from "@/shared/config/app";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";

export { emailVerifyIdentifier } from "@/features/auth/domain/verify";

function emailCodePepper() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET mancante");
  return secret;
}

function attemptKey(email: string) {
  return `email-code:${emailVerifyIdentifier(email)}`;
}

function expiryLabel(hours: number) {
  return hours === 1 ? "1 ora" : `${hours} ore`;
}

export async function getEmailVerificationChallenge(email: string) {
  const identifier = emailVerifyIdentifier(email);
  const rows = await prisma.verificationToken.findMany({ where: { identifier } });
  const newest = rows.reduce<(typeof rows)[number] | null>((current, row) => {
    if (!current || row.createdAt.getTime() > current.createdAt.getTime()) return row;
    return current;
  }, null);
  if (!newest) return { active: false, expiresAt: null as Date | null, resendAvailableAt: null as Date | null };
  const now = new Date();
  const active = newest.expires.getTime() > now.getTime();
  const delay = emailVerifyResendDelayMs(newest.createdAt, now);
  return {
    active,
    expiresAt: active ? newest.expires : null,
    resendAvailableAt: delay > 0 ? new Date(now.getTime() + delay) : null,
  };
}

export async function sendEmailVerification(input: { userId: string; email: string }) {
  const email = input.email.trim().toLowerCase();
  const identifier = emailVerifyIdentifier(email);
  const existing = await prisma.verificationToken.findMany({ where: { identifier } });
  const newest = existing.reduce<(typeof existing)[number] | null>((current, row) => {
    if (!current || row.createdAt.getTime() > current.createdAt.getTime()) return row;
    return current;
  }, null);
  if (newest) {
    const delay = emailVerifyResendDelayMs(newest.createdAt);
    if (delay > 0) {
      return { sent: false as const, reason: "cooldown" as const, retryAt: new Date(Date.now() + delay) };
    }
  }

  const code = createEmailVerifyCode();
  const codeHash = hashEmailVerifyCode(code, emailCodePepper());
  const expires = new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.rateLimitHit.deleteMany({ where: { key: attemptKey(email) } }),
    prisma.verificationToken.create({
      data: { identifier, token: codeHash, expires },
    }),
  ]);

  try {
    await dispatchOutboundEmail({
      idempotencyKey: `email-verify:${input.userId}:${randomBytes(8).toString("hex")}`,
      purpose: "EMAIL_VERIFY",
      templateKey: "EMAIL_VERIFY",
      to: email,
      userId: input.userId,
      recipientKind: "USER",
      variables: {
        title: it.emailVerifySubject,
        codice: code,
        scadenza: expiryLabel(EMAIL_VERIFY_HOURS),
        areaUrl: `${appOrigin()}/verifica-email`,
      },
      sourceEntityType: "User",
      sourceEntityId: input.userId,
    });
  } catch (error) {
    await prisma.verificationToken.deleteMany({ where: { identifier, token: codeHash } });
    throw error;
  }

  return { sent: true as const };
}

export async function deliverEmailVerification(input: { userId: string; email: string }) {
  try {
    return await sendEmailVerification(input);
  } catch {
    logger.error("email.verify.send_failed", { userId: input.userId });
    return { sent: false as const, reason: "failed" as const };
  }
}

export async function ensureEmailVerification(input: { userId: string; email: string }) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { emailVerified: true, email: true },
  });
  if (!user) return { verified: false as const };
  if (user.emailVerified) return { verified: true as const };
  await deliverEmailVerification({ userId: input.userId, email: user.email });
  return { verified: false as const };
}

export async function confirmEmailVerificationCode(input: { userId: string; email: string; code: string }) {
  const normalized = normalizeEmailVerifyCode(input.code);
  if (!normalized) return { ok: false as const, reason: "invalid" as const };

  const email = input.email.trim().toLowerCase();
  const identifier = emailVerifyIdentifier(email);
  const submittedHash = hashEmailVerifyCode(normalized, emailCodePepper());
  const key = attemptKey(email);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { email: true, emailVerified: true },
    });
    if (!user || user.email.toLowerCase() !== email) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (user.emailVerified) return { ok: true as const, userId: input.userId };

    const rows = await tx.verificationToken.findMany({ where: { identifier } });
    const live = rows.filter((row) => row.expires.getTime() > now.getTime());
    if (rows.length === 0) return { ok: false as const, reason: "invalid" as const };
    if (live.length === 0) {
      await tx.verificationToken.deleteMany({ where: { identifier } });
      return { ok: false as const, reason: "expired" as const };
    }

    const newest = live.reduce((current, row) => (row.createdAt > current.createdAt ? row : current));
    const attempts = await tx.rateLimitHit.count({
      where: { key, createdAt: { gt: newest.createdAt } },
    });
    const matches = live.some((row) => emailCodeHashesMatch(submittedHash, row.token));
    const judgement = judgeEmailVerifyCode({
      record: { expiresAt: newest.expires, attempts },
      matches,
      now,
    });

    if (judgement === "ok") {
      await tx.verificationToken.deleteMany({ where: { identifier } });
      await tx.rateLimitHit.deleteMany({ where: { key } });
      await tx.user.update({
        where: { id: input.userId },
        data: { emailVerified: now },
      });
      return { ok: true as const, userId: input.userId };
    }

    if (judgement === "expired") {
      await tx.verificationToken.deleteMany({ where: { identifier } });
      return { ok: false as const, reason: "expired" as const };
    }

    if (judgement === "mismatch") {
      await tx.rateLimitHit.create({ data: { key } });
      return { ok: false as const, reason: "mismatch" as const };
    }

    if (judgement === "locked") {
      await tx.rateLimitHit.create({ data: { key } });
      await tx.verificationToken.deleteMany({ where: { identifier } });
      return { ok: false as const, reason: "locked" as const };
    }

    return { ok: false as const, reason: "invalid" as const };
  });
}
