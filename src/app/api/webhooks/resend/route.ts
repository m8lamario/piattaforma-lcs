import { NextResponse } from "next/server";
import { emailAdapter } from "@/shared/adapters";
import { InvalidEmailWebhookSignatureError } from "@/shared/adapters/types";
import { applyEmailWebhookEvent } from "@/features/emails/data/events";
import { ERROR_CATALOG } from "@/shared/errors";
import { logger } from "@/shared/lib/logger";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = await emailAdapter.parseWebhook({
      headers: request.headers,
      rawBody,
    });
  } catch (error) {
    if (error instanceof InvalidEmailWebhookSignatureError) {
      return NextResponse.json(
        { ok: false, code: "EMAIL_WEBHOOK_INVALID" },
        { status: ERROR_CATALOG.EMAIL_WEBHOOK_INVALID.httpStatus },
      );
    }
    logger.error("email.webhook.parse_failed");
    return NextResponse.json(
      { ok: false, code: "EMAIL_WEBHOOK_INVALID" },
      { status: ERROR_CATALOG.EMAIL_WEBHOOK_INVALID.httpStatus },
    );
  }

  const applied = await applyEmailWebhookEvent(event);
  return NextResponse.json({
    ok: true,
    idempotent: "idempotent" in applied ? applied.idempotent : false,
    ignored: applied.ignored,
  });
}
