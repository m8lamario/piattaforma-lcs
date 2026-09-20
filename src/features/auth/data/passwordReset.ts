import { prisma } from "@/shared/lib/prisma";
import { hashInviteToken } from "@/features/teams/domain/token";
import { inspectResetToken, passwordResetIdentifier } from "@/features/auth/domain/reset";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(email: string, token: string) {
  const identifier = passwordResetIdentifier(email);
  const tokenHash = hashInviteToken(token);
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires: new Date(Date.now() + RESET_TTL_MS),
    },
  });
}

export async function consumePasswordResetToken(email: string, token: string) {
  const identifier = passwordResetIdentifier(email);
  const tokenHash = hashInviteToken(token);
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token: tokenHash } },
  });
  const outcome = inspectResetToken(record ? { expiresAt: record.expires } : null);
  if (outcome !== "ok" || !record) {
    return { ok: false as const, reason: outcome };
  }
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return { ok: true as const, email: identifier.slice("password-reset:".length) };
}

export async function findPasswordResetByToken(token: string) {
  const tokenHash = hashInviteToken(token);
  const record = await prisma.verificationToken.findFirst({
    where: { token: tokenHash, identifier: { startsWith: "password-reset:" } },
  });
  const outcome = inspectResetToken(record ? { expiresAt: record.expires } : null);
  if (outcome !== "ok" || !record) return null;
  return { email: record.identifier.slice("password-reset:".length), identifier: record.identifier };
}
