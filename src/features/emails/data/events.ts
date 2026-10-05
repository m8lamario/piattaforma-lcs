import { Prisma } from "@generated/client";
import type { EmailWebhookEvent } from "@/shared/adapters/types";
import { isTrackedProviderEvent, nextStatusFromProviderEvent } from "@/features/emails/domain/status";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

export async function applyEmailWebhookEvent(event: EmailWebhookEvent) {
  if (!event.providerMessageId) {
    logger.warn("email.webhook.missing_message_id", { type: event.type });
    return { ok: true as const, ignored: true as const };
  }

  const message = await prisma.emailMessage.findFirst({
    where: { provider: event.provider, providerMessageId: event.providerMessageId },
  });
  if (!message) {
    logger.warn("email.webhook.unknown_message", { type: event.type });
    return { ok: true as const, ignored: true as const };
  }

  try {
    await prisma.emailEvent.create({
      data: {
        emailMessageId: message.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        type: event.type,
        occurredAt: event.occurredAt,
        bounceType: event.bounceType ?? null,
        summary: event.summary ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true as const, idempotent: true as const, ignored: false as const };
    }
    throw error;
  }

  const nextStatus =
    isTrackedProviderEvent(event.type) ? nextStatusFromProviderEvent(message.status, event.type) : null;
  await prisma.emailMessage.update({
    where: { id: message.id },
    data: {
      lastEventAt: event.occurredAt,
      ...(nextStatus
        ? {
            status: nextStatus,
            errorMessage: event.summary ?? message.errorMessage,
            errorCode: nextStatus === "FAILED" || nextStatus === "BOUNCED" ? event.type : message.errorCode,
          }
        : {}),
    },
  });

  return { ok: true as const, idempotent: false as const, ignored: false as const, messageId: message.id };
}
