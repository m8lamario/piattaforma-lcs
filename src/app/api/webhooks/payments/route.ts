import { NextResponse } from "next/server";
import { paymentAdapter } from "@/shared/adapters";
import { InvalidWebhookSignatureError } from "@/shared/adapters/live/stripe";
import { applyProviderResult, getPaymentById } from "@/features/payments/data/payments";
import { prisma } from "@/shared/lib/prisma";
import { writeAuditLog } from "@/shared/lib/audit";
import { ERROR_CATALOG } from "@/shared/errors";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = await paymentAdapter.parseWebhook({
      headers: request.headers,
      rawBody,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ ok: false, code: "PAYMENT_WEBHOOK_INVALID" }, { status: ERROR_CATALOG.PAYMENT_WEBHOOK_INVALID.httpStatus });
    }
    return NextResponse.json({ ok: false, code: "PAYMENT_WEBHOOK_INVALID" }, { status: ERROR_CATALOG.PAYMENT_WEBHOOK_INVALID.httpStatus });
  }

  if (event.status === "PENDING" || event.providerPaymentId === "stub") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment =
    (event.paymentId ? await getPaymentById(event.paymentId) : null) ??
    (await prisma.payment.findFirst({
      where: {
        OR: [{ providerPaymentId: event.providerPaymentId }, { providerSessionId: event.providerPaymentId }],
        provider: event.provider,
      },
    }));
  if (!payment) {
    return NextResponse.json({ ok: false, code: "PAYMENT_WEBHOOK_UNKNOWN" }, { status: ERROR_CATALOG.PAYMENT_WEBHOOK_UNKNOWN.httpStatus });
  }

  const applied = await applyProviderResult({
    paymentId: payment.id,
    providerPaymentId: event.providerPaymentId,
    status: event.status,
  });
  if (!applied.ok) {
    const code = applied.reason === "duplicate" ? "PAYMENT_WEBHOOK_DUPLICATE" : "PAYMENT_WEBHOOK_CONFLICT";
    return NextResponse.json({ ok: false, code }, { status: ERROR_CATALOG[code].httpStatus });
  }
  await writeAuditLog({
    action: "PAYMENT_WEBHOOK",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { type: event.type, status: event.status, idempotent: applied.idempotent },
  });
  return NextResponse.json({ ok: true, idempotent: applied.idempotent });
}
