import { Prisma } from "@generated/client";
import { emailAdapter } from "@/shared/adapters";
import { appOrigin } from "@/shared/config/app";
import { isMinor } from "@/features/players/domain/age";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

async function minorGuardianEmail(userId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: {
      birthDate: true,
      guardians: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
    },
  });
  if (!profile?.birthDate || !isMinor(profile.birthDate)) return null;
  return profile.guardians[0]?.email?.trim().toLowerCase() || null;
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

async function hasNotification(input: {
  userId: string;
  type: string;
  key: string;
  value: string;
}) {
  const rows = await prisma.notification.findMany({
    where: { userId: input.userId, type: input.type },
    select: { metadata: true },
  });
  return rows.some((row) => metadataString(row.metadata, input.key) === input.value);
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, string>;
  emailVariables?: Record<string, string>;
}) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  const areaUrl = `${appOrigin()}/area`;
  const variables = {
    title: input.title,
    areaUrl,
    ...input.emailVariables,
  };
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  try {
    if (user?.email) {
      await emailAdapter.send({
        to: user.email,
        template: input.type,
        variables,
      });
    }
    const guardianEmail = await minorGuardianEmail(input.userId);
    if (guardianEmail && guardianEmail !== user?.email?.toLowerCase()) {
      await emailAdapter.send({
        to: guardianEmail,
        template: input.type,
        variables,
      });
    }
  } catch {
    logger.error("notification.email_failed", { type: input.type });
  }
  return row;
}

export async function notifyRegistrationApproved(userId: string, registrationId: string) {
  if (await hasNotification({ userId, type: "REGISTRATION_APPROVED", key: "registrationId", value: registrationId })) {
    return;
  }
  await createNotification({
    userId,
    type: "REGISTRATION_APPROVED",
    title: it.notificationRegistrationApprovedTitle,
    body: it.notificationRegistrationApprovedBody,
    metadata: { registrationId },
  });
}

export async function hasConsentReceipt(userId: string, fingerprint: string, registrationId: string) {
  const rows = await prisma.notification.findMany({
    where: { userId, type: "REGISTRATION_RECEIVED" },
    select: { metadata: true },
  });
  return rows.some(
    (row) =>
      metadataString(row.metadata, "fingerprint") === fingerprint &&
      metadataString(row.metadata, "registrationId") === registrationId,
  );
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
