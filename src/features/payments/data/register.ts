import { prisma } from "@/shared/lib/prisma";
import {
  exportIdentity,
  paymentDateLabel,
  paymentRoleLabel,
  paymentStatusLabel,
  paymentsToCsv,
  type PaymentRegisterRow,
} from "@/features/payments/domain/export";

export async function buildPaymentRegisterCsv() {
  const payments = await prisma.payment.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      providerPaymentId: true,
      billingName: true,
      billingEmail: true,
      billingLine1: true,
      billingLine2: true,
      billingPostalCode: true,
      billingCity: true,
      billingState: true,
      billingCountry: true,
      registrationId: true,
      teamId: true,
      payer: { select: { email: true } },
      registration: {
        select: {
          category: true,
          playerProfile: {
            select: { firstName: true, lastName: true, user: { select: { email: true } } },
          },
        },
      },
    },
  });

  const rows: PaymentRegisterRow[] = payments.map((payment) => {
    const profile = payment.registration?.playerProfile ?? null;
    const identity = exportIdentity({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      userEmail: profile?.user.email ?? payment.payer?.email,
      billingEmail: payment.billingEmail,
    });
    const teamFee = Boolean(payment.teamId && !payment.registrationId);
    return {
      ...identity,
      billingName: payment.billingName?.trim() ?? "",
      residenceLine: "",
      residencePostalCode: "",
      residenceCity: "",
      residenceProvince: "",
      billingLine: [payment.billingLine1, payment.billingLine2].filter(Boolean).join(", "),
      billingPostalCode: payment.billingPostalCode?.trim() ?? "",
      billingCity: payment.billingCity?.trim() ?? "",
      billingProvince: payment.billingState?.trim() ?? "",
      billingCountry: payment.billingCountry?.trim() ?? "",
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      paidOn: paymentDateLabel(payment.paidAt),
      role: paymentRoleLabel({
        category: payment.registration?.category ?? null,
        teamFee,
      }),
      status: paymentStatusLabel(payment.status),
      transactionId: payment.providerPaymentId?.trim() ?? "",
    };
  });

  return { csv: paymentsToCsv(rows), count: rows.length };
}
