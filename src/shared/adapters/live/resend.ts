import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { logger } from "@/shared/lib/logger";
import {
  InvalidEmailWebhookSignatureError,
  type EmailAdapter,
  type EmailSendResult,
  type EmailWebhookEvent,
} from "../types";

const SEND_TIMEOUT_MS = 10_000;
const WEBHOOK_TOLERANCE_SECONDS = 300;

export class EmailSendTimeoutError extends Error {
  constructor() {
    super("Timeout invio email");
    this.name = "EmailSendTimeoutError";
  }
}

export function verifyResendWebhookSignature(input: {
  rawBody: string;
  headers: Headers;
  secret: string;
}) {
  const id = input.headers.get("svix-id");
  const timestamp = input.headers.get("svix-timestamp");
  const signatureHeader = input.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) {
    throw new InvalidEmailWebhookSignatureError();
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new InvalidEmailWebhookSignatureError();
  }
  const secretPart = input.secret.startsWith("whsec_") ? input.secret.slice("whsec_".length) : input.secret;
  const key = Buffer.from(secretPart, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${input.rawBody}`).digest("base64");
  const signatures = signatureHeader
    .split(" ")
    .map((part) => {
      const [version, value] = part.split(",");
      return version === "v1" ? value : null;
    })
    .filter((value): value is string => Boolean(value));
  const expectedBuf = Buffer.from(expected);
  const match = signatures.some((value) => {
    const candidate = Buffer.from(value);
    return candidate.length === expectedBuf.length && timingSafeEqual(candidate, expectedBuf);
  });
  if (!match) throw new InvalidEmailWebhookSignatureError();
}

export function mapResendWebhookPayload(payload: unknown, providerEventId: string): EmailWebhookEvent {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new InvalidEmailWebhookSignatureError();
  }
  const record = payload as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  if (!type.startsWith("email.")) {
    throw new InvalidEmailWebhookSignatureError();
  }
  const data = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? (record.data as Record<string, unknown>)
    : {};
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  const createdAt = typeof record.created_at === "string" ? new Date(record.created_at) : new Date();
  const bounce = data.bounce && typeof data.bounce === "object" && !Array.isArray(data.bounce)
    ? (data.bounce as Record<string, unknown>)
    : null;
  const bounceType = typeof bounce?.type === "string" ? bounce.type : null;
  const summary =
    typeof bounce?.message === "string"
      ? bounce.message.slice(0, 300)
      : typeof data.error === "string"
        ? data.error.slice(0, 300)
        : null;
  return {
    provider: "resend",
    providerEventId,
    type,
    providerMessageId: emailId,
    occurredAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
    bounceType,
    summary,
  };
}

function isRetryableSendError(error: unknown) {
  if (error instanceof EmailSendTimeoutError) return true;
  if (error && typeof error === "object" && "statusCode" in error) {
    const status = Number((error as { statusCode?: number }).statusCode);
    return status >= 500;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("fetch") ||
      message.includes("econnreset") ||
      message.includes("etimedout") ||
      message.includes("network")
    );
  }
  return false;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new EmailSendTimeoutError()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createResendEmailAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !from) {
    throw new Error("Resend non configurato");
  }
  const client = new Resend(apiKey);
  return {
    provider: "resend",
    async send(input) {
      const payload = {
        from: input.from ?? from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo ?? replyTo,
      };
      const options = input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined;
      const attempt = () =>
        withTimeout(
          client.emails.send(payload, options) as Promise<{ data?: { id?: string } | null; error?: { message?: string; statusCode?: number } | null }>,
          SEND_TIMEOUT_MS,
        );

      let result;
      let retried = false;
      try {
        result = await attempt();
      } catch (error) {
        if (!isRetryableSendError(error)) throw error;
        retried = true;
        logger.warn("email.resend.retry", { template: input.tags?.template ?? "unknown" });
        result = await attempt();
      }
      if (result.error && !retried && (result.error.statusCode ?? 0) >= 500) {
        retried = true;
        logger.warn("email.resend.retry", { template: input.tags?.template ?? "unknown" });
        result = await attempt();
      }
      if (result.error) {
        const statusCode = result.error.statusCode;
        logger.error("email.resend.failed", {
          template: input.tags?.template ?? "unknown",
          statusCode: statusCode ?? undefined,
        });
        const failure = new Error("Invio email non riuscito") as Error & { statusCode?: number };
        failure.statusCode = statusCode;
        throw failure;
      }
      const providerMessageId = result.data?.id ?? null;
      logger.info("email.resend.sent", {
        template: input.tags?.template ?? "unknown",
        providerMessageId: providerMessageId ?? "none",
      });
      return { providerMessageId } satisfies EmailSendResult;
    },
    async parseWebhook(input) {
      if (!webhookSecret) throw new InvalidEmailWebhookSignatureError();
      verifyResendWebhookSignature({
        rawBody: input.rawBody,
        headers: input.headers,
        secret: webhookSecret,
      });
      let payload: unknown;
      try {
        payload = JSON.parse(input.rawBody);
      } catch {
        throw new InvalidEmailWebhookSignatureError();
      }
      const eventId = input.headers.get("svix-id") ?? "";
      if (!eventId) throw new InvalidEmailWebhookSignatureError();
      return mapResendWebhookPayload(payload, eventId);
    },
  };
}
