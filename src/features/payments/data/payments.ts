import { Prisma } from "@generated/client";
import type { Prisma as PrismaTypes } from "@generated/client";
import { billingFill, type BillingSnapshot } from "@/features/payments/domain/billing";
import { centsToDecimalString } from "@/features/payments/domain/fees";
import { webhookApplyDecision } from "@/features/payments/domain/integrity";
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
  amountCents: number;
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
        amount: new Prisma.Decimal(centsToDecimalString(input.amountCents)),
        currency: input.currency,
        status: "PENDING",
        provider: paymentProviderName(),
      },
    });
  });
}

export async function claimCheckoutPayment(input: {
  editionId: string;
  amountCents: number;
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
        amount: new Prisma.Decimal(centsToDecimalString(input.amountCents)),
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

export async function rememberStripeCustomer(userId: string, stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) return;
  await prisma.user.updateMany({
    where: { id: userId, stripeCustomerId: null },
    data: { stripeCustomerId },
  });
}

export async function applyProviderResult(input: {
  paymentId: string;
  providerPaymentId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  receiptUrl?: string | null;
  billing?: BillingSnapshot | null;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: input.paymentId } });
    const other = await tx.payment.findFirst({
      where: {
        providerPaymentId: input.providerPaymentId,
        status: "SUCCEEDED",
        NOT: { id: input.paymentId },
      },
      select: { id: true },
    });
    const decision = webhookApplyDecision({
      current: current ? { id: current.id, status: current.status } : null,
      incomingStatus: input.status,
      otherSucceededWithSameProviderId: Boolean(other),
    });
    if (decision === "duplicate") return { ok: false as const, reason: "duplicate" as const };
    if (decision === "not_found" || decision === "conflict") {
      return { ok: false as const, reason: "conflict" as const };
    }

    const patch = billingFill(current, input.billing);
    if (decision === "idempotent") {
      if (Object.keys(patch).length > 0) {
        await tx.payment.update({ where: { id: input.paymentId }, data: patch });
      }
      return { ok: true as const, idempotent: true };
    }

    const updated = await tx.payment.updateMany({
      where: {
        id: input.paymentId,
        status: input.status === "REFUNDED" ? "SUCCEEDED" : { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: input.status,
        providerPaymentId: input.providerPaymentId,
        ...(input.status === "SUCCEEDED" ? { paidAt: new Date() } : {}),
        ...(input.status === "FAILED" ? { paidAt: null } : {}),
        receiptUrl: input.receiptUrl ?? null,
        ...patch,
      },
    });
    if (updated.count === 0) {
      const latest = await tx.payment.findUnique({ where: { id: input.paymentId } });
      if (latest?.status === input.status) {
        const latePatch = billingFill(latest, input.billing);
        if (Object.keys(latePatch).length > 0) {
          await tx.payment.update({ where: { id: input.paymentId }, data: latePatch });
        }
        return { ok: true as const, idempotent: true };
      }
      return { ok: false as const, reason: "conflict" as const };
    }
    return { ok: true as const, idempotent: false };
  });
}
