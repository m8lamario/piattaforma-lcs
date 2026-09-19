import { NextResponse } from "next/server";
import { paymentAdapter } from "@/shared/adapters";
import { applyProviderResult } from "@/features/payments/data/payments";
import { prisma } from "@/shared/lib/prisma";
import { writeAuditLog } from "@/shared/lib/audit";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = await paymentAdapter.parseWebhook({
    headers: request.headers,
    rawBody,
  });

  if (event.status === "PENDING" || event.providerPaymentId === "stub") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: event.providerPaymentId, provider: event.provider },
  });
  if (!payment) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await applyProviderResult({
    paymentId: payment.id,
    providerPaymentId: event.providerPaymentId,
    status: event.status,
  });
  await writeAuditLog({
    action: "PAYMENT_WEBHOOK",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { type: event.type, status: event.status },
  });
  return NextResponse.json({ ok: true });
}
