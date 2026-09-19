import { Prisma } from "@generated/client";
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
      provider: "stub",
    },
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
    where: { provider: "stub", providerPaymentId: input.providerPaymentId, status: "SUCCEEDED" },
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
