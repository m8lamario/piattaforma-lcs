import { isMinor } from "@/features/players/domain/age";
import {
  g3Value,
  latestAccepted,
  latestChoices,
  MARKETING_CODE,
  marketingConfirmed,
  mediaBoxesRecorded,
  privacyBoxesComplete,
} from "@/features/consents/domain/boxes";
import { isPrivacyPackComplete, type CurrentConsent } from "@/features/consents/domain/pack";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import {
  confirmationUrl,
  issueConsentToken,
  sendC1Email,
  sendMarketingOptInEmail,
} from "@/features/consents/data/tokens";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

async function registrationFollowupContext(registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      playerProfile: {
        include: {
          guardians: { orderBy: { createdAt: "asc" } },
          user: { select: { email: true } },
        },
      },
      consentChoices: { orderBy: { createdAt: "asc" } },
      consentRecords: {
        include: { legalDocumentVersion: { include: { legalDocument: true } } },
      },
      consentTokens: {
        where: { purpose: "C1", usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!registration) return null;
  const profile = registration.playerProfile;
  const isMinorPlayer = profile.birthDate ? isMinor(profile.birthDate) : false;
  const map = latestChoices(
    registration.consentChoices.map((row) => ({
      code: row.code,
      accepted: row.accepted,
      value: row.value,
      createdAt: row.createdAt.getTime(),
    })),
  );
  const consents: CurrentConsent[] = registration.consentRecords.map((record) => ({
    slug: record.legalDocumentVersion.legalDocument.slug,
    versionId: record.legalDocumentVersionId,
    isCurrent: record.legalDocumentVersion.isCurrent,
    accepted: record.accepted,
  }));
  const partnersPublished = await isPartnerBoxVisible();
  const privacyReady =
    isPrivacyPackComplete(isMinorPlayer, consents) &&
    privacyBoxesComplete(isMinorPlayer, partnersPublished, map);
  const mediaReady = mediaBoxesRecorded(isMinorPlayer, map);
  return {
    registration,
    profile,
    isMinorPlayer,
    map,
    privacyReady,
    mediaReady,
    partnersPublished,
  };
}

export async function ensureC1Sent(registrationId: string) {
  const ctx = await registrationFollowupContext(registrationId);
  if (!ctx || !ctx.isMinorPlayer || !ctx.privacyReady || !ctx.mediaReady) return;
  if (g3Value(ctx.map) !== "OTHER_PARENT") return;
  if (latestAccepted(ctx.map, "C1")) return;
  if (ctx.registration.consentTokens.length > 0) return;

  const secondary = ctx.profile.guardians.find((row) => row.kind === "SECONDARY");
  const email = secondary?.email?.trim().toLowerCase();
  if (!secondary || !email) return;

  try {
    const token = await issueConsentToken({
      registrationId,
      purpose: "C1",
      email,
      guardianId: secondary.id,
    });
    await sendC1Email({
      to: email,
      playerName: `${ctx.profile.firstName} ${ctx.profile.lastName}`.trim(),
      confirmUrl: confirmationUrl("C1", token),
      summary: it.confirmC1Help,
    });
  } catch {
    logger.error("consent.c1_email_failed", { registrationId });
  }
}

export async function ensureMarketingOptIn(registrationId: string) {
  const ctx = await registrationFollowupContext(registrationId);
  if (!ctx) return;
  const code = ctx.isMinorPlayer ? MARKETING_CODE.minor : MARKETING_CODE.adult;
  if (!latestAccepted(ctx.map, code)) return;
  const used = await prisma.consentToken.findMany({
    where: { registrationId, purpose: "MARKETING", usedAt: { not: null } },
    select: { usedAt: true },
  });
  if (
    marketingConfirmed(
      ctx.map,
      used.map((row) => ({ usedAt: row.usedAt?.getTime() ?? null })),
    )
  ) {
    return;
  }

  const pending = await prisma.consentToken.findFirst({
    where: {
      registrationId,
      purpose: "MARKETING",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) return;

  const primary = ctx.profile.guardians.find((row) => row.kind !== "SECONDARY") ?? ctx.profile.guardians[0];
  const to = ctx.isMinorPlayer ? primary?.email?.trim().toLowerCase() : ctx.profile.user.email.trim().toLowerCase();
  if (!to) return;

  try {
    const token = await issueConsentToken({
      registrationId,
      purpose: "MARKETING",
      email: to,
      guardianId: ctx.isMinorPlayer ? primary?.id : null,
    });
    await sendMarketingOptInEmail({
      to,
      confirmUrl: confirmationUrl("MARKETING", token),
    });
  } catch {
    logger.error("consent.marketing_email_failed", { registrationId });
  }
}

