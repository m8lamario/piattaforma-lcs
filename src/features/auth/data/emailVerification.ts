import { prisma } from "@/shared/lib/prisma";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";
import { emailVerifyIdentifier, inspectEmailVerifyToken } from "@/features/auth/domain/verify";
import { EMAIL_VERIFY_HOURS, appOrigin } from "@/shared/config/app";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { it } from "@/shared/i18n/it";

export { emailVerifyIdentifier } from "@/features/auth/domain/verify";

export async function createEmailVerificationToken(email: string, token: string) {
  const identifier = emailVerifyIdentifier(email);
  const tokenHash = hashInviteToken(token);
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires: new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000),
    },
  });
}

export async function sendEmailVerification(input: { userId: string; email: string }) {
  const token = createInviteToken();
  await createEmailVerificationToken(input.email, token);
  const confirmUrl = `${appOrigin()}/verifica-email/${encodeURIComponent(token)}`;
  await dispatchOutboundEmail({
    idempotencyKey: `email-verify:${input.userId}:${token.slice(-8)}`,
    purpose: "EMAIL_VERIFY",
    templateKey: "EMAIL_VERIFY",
    to: input.email,
    userId: input.userId,
    recipientKind: "USER",
    variables: {
      title: it.emailVerifySubject,
      confirmUrl,
      scadenza: `${EMAIL_VERIFY_HOURS}h`,
    },
    sourceEntityType: "User",
    sourceEntityId: input.userId,
  });
}

export async function consumeEmailVerificationToken(token: string) {
  const tokenHash = hashInviteToken(token);
  const record = await prisma.verificationToken.findFirst({
    where: { token: tokenHash, identifier: { startsWith: "email-verify:" } },
  });
  const outcome = inspectEmailVerifyToken(record ? { expiresAt: record.expires } : null);
  if (outcome !== "ok" || !record) {
    return { ok: false as const };
  }
  const email = record.identifier.slice("email-verify:".length);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: false as const };
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  return { ok: true as const, userId: user.id, email };
}
