import { Prisma } from "@generated/client";
import { appOrigin } from "@/shared/config/app";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { minorGuardianEmail } from "@/features/emails/data/recipients";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

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

async function dispatchNotificationEmails(input: {
  notificationId: string;
  userId: string;
  type: string;
  variables: Record<string, string>;
  sourceEntityType?: string;
  sourceEntityId?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  try {
    if (user?.email) {
      await dispatchOutboundEmail({
        idempotencyKey: `notification:${input.notificationId}:user`,
        purpose: input.type,
        templateKey: input.type,
        to: user.email,
        userId: input.userId,
        recipientKind: "USER",
        variables: input.variables,
        notificationId: input.notificationId,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
      });
    }
    const guardianEmail = await minorGuardianEmail(input.userId);
    if (guardianEmail && guardianEmail !== user?.email?.toLowerCase()) {
      await dispatchOutboundEmail({
        idempotencyKey: `notification:${input.notificationId}:guardian`,
        purpose: input.type,
        templateKey: input.type,
        to: guardianEmail,
        userId: input.userId,
        recipientKind: "GUARDIAN",
        variables: input.variables,
        notificationId: input.notificationId,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
      });
    }
  } catch {
    logger.error("notification.email_failed", { type: input.type });
  }
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
    link: areaUrl,
    ...input.emailVariables,
  };
  await dispatchNotificationEmails({
    notificationId: row.id,
    userId: input.userId,
    type: input.type,
    variables,
    sourceEntityType: input.metadata?.registrationId
      ? "Registration"
      : input.metadata?.documentId
        ? "Document"
        : undefined,
    sourceEntityId: input.metadata?.registrationId ?? input.metadata?.documentId,
  });
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
