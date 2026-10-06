import type { EmailStatus } from "@generated/client";
import { Prisma } from "@generated/client";
import {
  emailDriver,
  emailFromAddress,
  emailReplyTo,
  resendConfigured,
  resendWebhookConfigured,
} from "@/shared/config/drivers";
import { ATTENTION_EMAIL_STATUSES } from "@/features/emails/domain/status";
import { prisma } from "@/shared/lib/prisma";

export const EMAIL_PAGE_SIZE = 25;

export type EmailListQuery = {
  q?: string;
  status?: EmailStatus;
  purpose?: string;
  from?: Date;
  to?: Date;
  sort?: "queuedAt" | "lastEventAt" | "subject";
  page?: number;
};

export function emailProviderStatus() {
  const driver = emailDriver();
  return {
    driver,
    from: emailFromAddress(),
    replyTo: emailReplyTo(),
    live: driver === "resend" && resendConfigured(),
    webhookConfigured: resendWebhookConfigured(),
  };
}

export async function emailDashboardStats() {
  const [sent, delivered, failed, bounced, complained, recent, attention] = await Promise.all([
    prisma.emailMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "DELIVERY_DELAYED"] } } }),
    prisma.emailMessage.count({ where: { status: "DELIVERED" } }),
    prisma.emailMessage.count({ where: { status: "FAILED" } }),
    prisma.emailMessage.count({ where: { status: "BOUNCED" } }),
    prisma.emailMessage.count({ where: { status: "COMPLAINED" } }),
    prisma.emailMessage.findMany({
      orderBy: { queuedAt: "desc" },
      take: 8,
      select: listSelect,
    }),
    prisma.emailMessage.findMany({
      where: { status: { in: [...ATTENTION_EMAIL_STATUSES] } },
      orderBy: { lastEventAt: "desc" },
      take: 8,
      select: listSelect,
    }),
  ]);
  return { sent, delivered, failed, bounced, complained, recent, attention, config: emailProviderStatus() };
}

const listSelect = {
  id: true,
  toAddress: true,
  subject: true,
  purpose: true,
  status: true,
  queuedAt: true,
  sentAt: true,
  lastEventAt: true,
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.EmailMessageSelect;

function listWhere(query: EmailListQuery): Prisma.EmailMessageWhereInput {
  const where: Prisma.EmailMessageWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.purpose) where.purpose = query.purpose;
  if (query.from || query.to) {
    where.queuedAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { toAddress: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function listEmailMessages(query: EmailListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const where = listWhere(query);
  const sort = query.sort ?? "queuedAt";
  const orderBy: Prisma.EmailMessageOrderByWithRelationInput =
    sort === "subject" ? { subject: "asc" } : sort === "lastEventAt" ? { lastEventAt: "desc" } : { queuedAt: "desc" };
  const [rows, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy,
      skip: (page - 1) * EMAIL_PAGE_SIZE,
      take: EMAIL_PAGE_SIZE,
      select: listSelect,
    }),
    prisma.emailMessage.count({ where }),
  ]);
  return { rows, total, page, pageSize: EMAIL_PAGE_SIZE, pages: Math.max(1, Math.ceil(total / EMAIL_PAGE_SIZE)) };
}

export async function getEmailMessage(id: string) {
  return prisma.emailMessage.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      actor: { select: { id: true, email: true, name: true } },
      events: { orderBy: { occurredAt: "asc" } },
    },
  });
}

export async function searchEmailRecipients(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  return prisma.user.findMany({
    where: {
      lifecycleStatus: "ACTIVE",
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { playerProfile: { firstName: { contains: term, mode: "insensitive" } } },
        { playerProfile: { lastName: { contains: term, mode: "insensitive" } } },
      ],
    },
    take: 20,
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      playerProfile: {
        select: {
          firstName: true,
          lastName: true,
          birthDate: true,
          guardians: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
        },
      },
    },
  });
}

export async function getEmailRecipient(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, lifecycleStatus: "ACTIVE" },
    select: {
      id: true,
      email: true,
      name: true,
      playerProfile: {
        select: {
          firstName: true,
          lastName: true,
          birthDate: true,
          guardians: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
        },
      },
    },
  });
}

export async function listEmailTemplateOverrides() {
  return prisma.emailTemplateOverride.findMany();
}

export async function upsertEmailTemplateOverride(input: {
  key: string;
  subject: string;
  textBody: string;
  updatedById: string;
}) {
  return prisma.emailTemplateOverride.upsert({
    where: { key: input.key },
    create: input,
    update: {
      subject: input.subject,
      textBody: input.textBody,
      updatedById: input.updatedById,
    },
  });
}

export async function listUsersOnStaleLegalVersion(slug: string) {
  const document = await prisma.legalDocument.findUnique({
    where: { slug },
    include: {
      versions: {
        select: { id: true, version: true, isCurrent: true },
      },
    },
  });
  if (!document) return { document: null, current: null, users: [] as { userId: string; email: string }[] };
  const current = document.versions.find((row) => row.isCurrent) ?? null;
  const records = await prisma.consentRecord.findMany({
    where: {
      accepted: true,
      legalDocumentVersion: { legalDocumentId: document.id },
    },
    orderBy: { acceptedAt: "desc" },
    select: {
      userId: true,
      legalDocumentVersion: { select: { id: true, isCurrent: true } },
      user: { select: { email: true, lifecycleStatus: true } },
    },
  });
  const latest = new Map<string, (typeof records)[number]>();
  for (const row of records) {
    if (!latest.has(row.userId)) latest.set(row.userId, row);
  }
  const users = [...latest.values()]
    .filter((row) => !row.legalDocumentVersion.isCurrent && row.user.lifecycleStatus === "ACTIVE")
    .map((row) => ({ userId: row.userId, email: row.user.email }));
  return { document, current, users };
}

export async function redactUserEmailHistory(
  userId: string,
  previousEmail?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  toAddress = "redatto",
) {
  await db.emailMessage.updateMany({
    where: previousEmail
      ? { OR: [{ userId }, { toAddress: previousEmail.toLowerCase() }] }
      : { userId },
    data: {
      toAddress,
      subject: "[redatto]",
      textBody: "[redatto]",
      replyTo: null,
      errorMessage: null,
    },
  });
}
