import { Prisma, type EmailRecipientKind, type EmailStatus } from "@generated/client";
import { emailAdapter } from "@/shared/adapters";
import { emailFromAddress, emailReplyTo } from "@/shared/config/drivers";
import { isEmailTemplateKey } from "@/features/emails/domain/catalog";
import { canRetryEmail } from "@/features/emails/domain/status";
import { defaultEmailTemplates, renderEmailContent, type EmailTemplateSource } from "@/features/emails/domain/templates";
import { pickEmailVariables, redactSecretVariables } from "@/features/emails/domain/variables";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

export type DispatchEmailInput = {
  idempotencyKey: string;
  purpose: string;
  templateKey: string;
  to: string;
  userId?: string | null;
  recipientKind?: EmailRecipientKind;
  variables?: Record<string, string>;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  notificationId?: string | null;
  actorUserId?: string | null;
  customSubject?: string;
  customText?: string;
};

function shouldAttemptSend(row: { status: EmailStatus; providerMessageId: string | null }) {
  if (row.providerMessageId) return false;
  return row.status === "QUEUED" || canRetryEmail(row);
}

function clipError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return "Invio non riuscito";
}

async function loadTemplate(key: string): Promise<EmailTemplateSource> {
  const defaults = defaultEmailTemplates();
  const fallback = isEmailTemplateKey(key) ? defaults[key] : defaults.MANUAL;
  const override = await prisma.emailTemplateOverride.findUnique({ where: { key: fallback.key } });
  if (!override) return fallback;
  return { key: fallback.key, subject: override.subject, textBody: override.textBody };
}

async function recipientVariables(userId?: string | null): Promise<Record<string, string>> {
  if (!userId) return {};
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      playerProfile: {
        select: {
          firstName: true,
          lastName: true,
          registrations: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { team: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!user) return {};
  return pickEmailVariables({
    email: user.email,
    nome: user.playerProfile?.firstName ?? "",
    cognome: user.playerProfile?.lastName ?? "",
    nome_squadra: user.playerProfile?.registrations[0]?.team.name ?? "",
  });
}

async function recordLocalEvent(input: {
  emailMessageId: string;
  type: string;
  providerEventId: string;
  summary?: string | null;
}) {
  try {
    await prisma.emailEvent.create({
      data: {
        emailMessageId: input.emailMessageId,
        provider: "local",
        providerEventId: input.providerEventId,
        type: input.type,
        occurredAt: new Date(),
        summary: input.summary ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

export async function dispatchOutboundEmail(input: DispatchEmailInput): Promise<{
  id: string;
  status: EmailStatus;
  skipped: boolean;
}> {
  const to = input.to.trim().toLowerCase();
  const template = await loadTemplate(input.templateKey);
  const mergedVariables = {
    ...(await recipientVariables(input.userId)),
    email: to,
    ...input.variables,
  };
  const rendered = renderEmailContent({
    template,
    variables: mergedVariables,
    customSubject: input.customSubject,
    customText: input.customText,
  });
  const storedBody = redactSecretVariables(rendered.text, rendered.variables);
  const fromAddress = emailFromAddress();
  const replyTo = emailReplyTo();
  const provider = emailAdapter.provider;
  const now = new Date();

  let row = await prisma.emailMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (!row) {
    try {
      row = await prisma.emailMessage.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          purpose: input.purpose,
          templateKey: template.key,
          status: "QUEUED",
          userId: input.userId ?? null,
          recipientKind: input.recipientKind ?? "USER",
          toAddress: to,
          fromAddress,
          replyTo,
          subject: rendered.subject,
          textBody: storedBody,
          provider,
          sourceEntityType: input.sourceEntityType ?? null,
          sourceEntityId: input.sourceEntityId ?? null,
          notificationId: input.notificationId ?? null,
          actorUserId: input.actorUserId ?? null,
          queuedAt: now,
        },
      });
      await recordLocalEvent({
        emailMessageId: row.id,
        type: "local.queued",
        providerEventId: `${row.id}:queued`,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      row = await prisma.emailMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    }
  }

  if (!row) {
    logger.error("email.dispatch.missing", { template: template.key });
    return { id: "unknown", status: "FAILED", skipped: true };
  }

  if (!shouldAttemptSend(row)) {
    return { id: row.id, status: row.status, skipped: true };
  }

  try {
    const result = await emailAdapter.send({
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      from: fromAddress,
      replyTo,
      idempotencyKey: row.id,
      tags: { template: template.key, purpose: input.purpose },
    });
    const sentAt = new Date();
    const updated = await prisma.emailMessage.update({
      where: { id: row.id },
      data: {
        status: "SENT",
        provider,
        providerMessageId: result.providerMessageId,
        sentAt,
        lastEventAt: sentAt,
        errorCode: null,
        errorMessage: null,
        subject: rendered.subject,
        textBody: storedBody,
        fromAddress,
        replyTo,
      },
    });
    await recordLocalEvent({
      emailMessageId: row.id,
      type: "local.accepted",
      providerEventId: `${row.id}:accepted:${sentAt.toISOString()}`,
    });
    logger.info("email.dispatch.sent", {
      template: template.key,
      id: row.id,
      providerMessageId: result.providerMessageId ?? "none",
    });
    return { id: updated.id, status: updated.status, skipped: false };
  } catch (error) {
    const failedAt = new Date();
    await prisma.emailMessage.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        lastEventAt: failedAt,
        errorCode: "SEND_FAILED",
        errorMessage: clipError(error),
        subject: rendered.subject,
        textBody: storedBody,
      },
    });
    await recordLocalEvent({
      emailMessageId: row.id,
      type: "local.send_failed",
      providerEventId: `${row.id}:failed:${failedAt.toISOString()}`,
      summary: clipError(error),
    });
    logger.error("email.dispatch.failed", { template: template.key, id: row.id });
    return { id: row.id, status: "FAILED", skipped: false };
  }
}

export async function retryOutboundEmail(id: string) {
  const row = await prisma.emailMessage.findUnique({ where: { id } });
  if (!row) return null;
  if (!canRetryEmail(row)) return { id: row.id, status: row.status, skipped: true as const, retryable: false as const };
  return {
    ...(await dispatchOutboundEmail({
      idempotencyKey: row.idempotencyKey,
      purpose: row.purpose,
      templateKey: row.templateKey,
      to: row.toAddress,
      userId: row.userId,
      recipientKind: row.recipientKind,
      sourceEntityType: row.sourceEntityType,
      sourceEntityId: row.sourceEntityId,
      notificationId: row.notificationId,
      actorUserId: row.actorUserId,
    })),
    retryable: true as const,
  };
}
