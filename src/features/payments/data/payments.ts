import { Prisma } from "@generated/client";
import { paymentProviderName } from "@/shared/config/drivers";
import { prisma } from "@/shared/lib/prisma";

export async function createPendingPayment(input: {
  editionId: string;
  amount: number;
  currency: string;
  registrationId?: string;
  teamId?: string;
  payerUserId: string;
}) {
  return prisma.payment.create({
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
    : { teamId: input.teamId };

  return prisma.$transaction(async (tx) => {
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
