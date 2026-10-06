import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";
import {
  C1_REMINDER_DAYS,
  C1_TOKEN_DAYS,
  MARKETING_OPTIN_DAYS,
  appOrigin,
} from "@/shared/config/app";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { it } from "@/shared/i18n/it";
import { prisma } from "@/shared/lib/prisma";

export type ConsentTokenPurpose = "C1" | "MARKETING";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function issueConsentToken(input: {
  registrationId: string;
  purpose: ConsentTokenPurpose;
  email: string;
  guardianId?: string | null;
}) {
  await prisma.consentToken.updateMany({
    where: {
      registrationId: input.registrationId,
      purpose: input.purpose,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
  const token = createInviteToken();
  const days = input.purpose === "C1" ? C1_TOKEN_DAYS : MARKETING_OPTIN_DAYS;
  const row = await prisma.consentToken.create({
    data: {
      registrationId: input.registrationId,
      purpose: input.purpose,
      tokenHash: hashInviteToken(token),
      email: input.email.trim().toLowerCase(),
      guardianId: input.guardianId ?? null,
      expiresAt: daysFromNow(days),
    },
  });
  return { token, id: row.id };
}

export async function findValidConsentToken(token: string, purpose: ConsentTokenPurpose) {
  try {
    const row = await prisma.consentToken.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      include: {
        registration: {
          include: {
            playerProfile: { select: { firstName: true, lastName: true, userId: true, birthDate: true } },
          },
        },
        guardian: true,
      },
    });
    if (!row || row.purpose !== purpose) return null;
    if (row.usedAt) return { ...row, stale: "used" as const };
    if (row.expiresAt.getTime() < Date.now()) return { ...row, stale: "expired" as const };
    return { ...row, stale: null };
  } catch {
    return null;
  }
}

export function confirmationUrl(purpose: ConsentTokenPurpose, token: string) {
  const path = purpose === "C1" ? "conferma-genitore" : "conferma-marketing";
  return `${appOrigin()}/${path}/${encodeURIComponent(token)}`;
}

export async function sendC1Email(input: {
  to: string;
  playerName: string;
  confirmUrl: string;
  summary: string;
  userId?: string | null;
  tokenId?: string;
  registrationId?: string;
}) {
  await dispatchOutboundEmail({
    idempotencyKey: input.tokenId ? `consent-c1:${input.tokenId}` : `consent-c1:${input.to}:${input.confirmUrl.slice(-12)}`,
    purpose: "CONSENT_C1",
    templateKey: "CONSENT_C1",
    to: input.to,
    userId: input.userId ?? null,
    recipientKind: "GUARDIAN",
    variables: {
      title: it.emailC1Subject,
      playerName: input.playerName,
      confirmUrl: input.confirmUrl,
      summary: input.summary,
    },
    sourceEntityType: input.registrationId ? "Registration" : "ConsentToken",
    sourceEntityId: input.registrationId ?? input.tokenId ?? null,
  });
}

export async function sendMarketingOptInEmail(input: {
  to: string;
  confirmUrl: string;
  userId?: string | null;
  tokenId?: string;
  registrationId?: string;
  recipientKind?: "USER" | "GUARDIAN";
}) {
  await dispatchOutboundEmail({
    idempotencyKey: input.tokenId ? `consent-marketing:${input.tokenId}` : `consent-marketing:${input.to}:${input.confirmUrl.slice(-12)}`,
    purpose: "CONSENT_MARKETING_OPTIN",
    templateKey: "CONSENT_MARKETING_OPTIN",
    to: input.to,
    userId: input.userId ?? null,
    recipientKind: input.recipientKind ?? "USER",
    variables: {
      title: it.emailMarketingOptInSubject,
      confirmUrl: input.confirmUrl,
    },
    sourceEntityType: input.registrationId ? "Registration" : "ConsentToken",
    sourceEntityId: input.registrationId ?? input.tokenId ?? null,
  });
}

export async function maybeSendC1Reminder(registrationId: string) {
  const pending = await prisma.consentToken.findFirst({
    where: {
      registrationId,
      purpose: "C1",
      usedAt: null,
      reminderSentAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      registration: {
        include: { playerProfile: { select: { firstName: true, lastName: true, userId: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) return;
  const due = pending.createdAt.getTime() + C1_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() < due) return;
  const token = createInviteToken();
  await prisma.consentToken.update({
    where: { id: pending.id },
    data: { reminderSentAt: new Date(), tokenHash: hashInviteToken(token) },
  });
  await sendC1Email({
    to: pending.email,
    playerName: `${pending.registration.playerProfile.firstName} ${pending.registration.playerProfile.lastName}`.trim(),
    confirmUrl: confirmationUrl("C1", token),
    summary: it.emailC1ReminderSummary,
    userId: pending.registration.playerProfile.userId,
    tokenId: `${pending.id}:reminder`,
    registrationId,
  });
}

export async function markTokenUsed(id: string, ip?: string | null, userAgent?: string | null) {
  return prisma.consentToken.update({
    where: { id },
    data: { usedAt: new Date(), ipAddress: ip ?? null, userAgent: userAgent ?? null },
  });
}

export async function hasMarketingOptIn(registrationId: string) {
  const row = await prisma.consentToken.findFirst({
    where: { registrationId, purpose: "MARKETING", usedAt: { not: null } },
    orderBy: { usedAt: "desc" },
  });
  return Boolean(row);
}
