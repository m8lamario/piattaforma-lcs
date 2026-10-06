import { Prisma } from "@generated/client";
import type { Prisma as PrismaTypes } from "@generated/client";
import { paymentProviderName } from "@/shared/config/drivers";
import { paymentScopeViolation } from "@/shared/domain/hierarchy";
import { prisma } from "@/shared/lib/prisma";

type PaymentWriter = PrismaTypes.TransactionClient | typeof prisma;

async function readPaymentScope(
  db: PaymentWriter,
  input: { editionId: string; registrationId?: string; teamId?: string },
) {
  const team = input.teamId
    ? await db.team.findUnique({ where: { id: input.teamId }, select: { editionId: true } })
    : null;
  const registration = input.registrationId
    ? await db.registration.findUnique({
        where: { id: input.registrationId },
        select: { editionId: true, teamId: true },
      })
    : null;

  return paymentScopeViolation({
    editionId: input.editionId,
    teamId: input.teamId,
    teamEditionId: team?.editionId,
    registrationId: input.registrationId,
    registrationEditionId: registration?.editionId,
    registrationTeamId: registration?.teamId,
  });
}

export async function createPendingPayment(input: {
  editionId: string;
  amount: number;
  currency: string;
  registrationId?: string;
  teamId?: string;
  payerUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const violation = await readPaymentScope(tx, input);
    if (violation) {
      throw new Error("PAYMENT_SCOPE_MISMATCH");
    }
    return tx.payment.create({
      data: {
        editionId: input.editionId,
        registrationId: input.registrationId,
        teamId: input.teamId,
        payerUserId: input.payerUserId,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        status: "PENDING",
        provider: paymentProviderName(),
      },
    });
  });
}

export async function claimCheckoutPayment(input: {
  editionId: string;
  amount: number;
  currency: string;
  payerUserId: string;
  registrationId?: string;
  teamId?: string;
}) {
  const where = input.registrationId
    ? { registrationId: input.registrationId }
    : { teamId: input.teamId, registrationId: null };

  return prisma.$transaction(async (tx) => {
    const violation = await readPaymentScope(tx, input);
    if (violation) {
      return { ok: false as const, reason: "scope" as const, payment: null };
    }
    const succeeded = await tx.payment.findFirst({
      where: { ...where, status: "SUCCEEDED" },
    });
    if (succeeded) {
      return { ok: false as const, reason: "covered" as const, payment: succeeded };
    }
    const pending = await tx.payment.findFirst({
      where: { ...where, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      return { ok: true as const, reused: true, payment: pending };
    }
    const payment = await tx.payment.create({
      data: {
        editionId: input.editionId,
        registrationId: input.registrationId,
        teamId: input.teamId,
        payerUserId: input.payerUserId,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        status: "PENDING",
        provider: paymentProviderName(),
      },
    });
    return { ok: true as const, reused: false, payment };
  });
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: { registration: true, team: true },
  });
}

export async function applyProviderResult(input: {
  paymentId: string;
  providerPaymentId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  receiptUrl?: string | null;
}) {
  const existing = await prisma.payment.findFirst({
    where: { providerPaymentId: input.providerPaymentId, status: "SUCCEEDED" },
  });
  if (existing && existing.id !== input.paymentId) {
    return { ok: false as const, reason: "duplicate" as const };
  }

  const updated = await prisma.payment.updateMany({
    where: { id: input.paymentId, status: { in: ["PENDING", "FAILED"] } },
    data: {
      status: input.status,
      providerPaymentId: input.providerPaymentId,
      paidAt: input.status === "SUCCEEDED" ? new Date() : null,
      receiptUrl: input.receiptUrl ?? null,
    },
  });
  if (updated.count === 0) {
    const current = await prisma.payment.findUnique({ where: { id: input.paymentId } });
    if (current?.status === input.status) return { ok: true as const, idempotent: true };
    return { ok: false as const, reason: "conflict" as const };
  }
  return { ok: true as const, idempotent: false };
}
