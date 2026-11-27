import { createHmac } from "node:crypto";
import { logger } from "@/shared/lib/logger";

export type MedicalReviewWebhookPayload = {
  event: "certificate.uploaded";
  certificate_id: string;
  uploaded_at: string;
};

export function medicalReviewWebhookConfig(
  env: Record<string, string | undefined> = process.env,
): { url: string; secret: string } | null {
  const url = env.MEDICAL_REVIEW_WEBHOOK_URL?.trim() ?? "";
  const secret = env.MEDICAL_REVIEW_WEBHOOK_SECRET?.trim() ?? "";
  if (!url || !secret) return null;
  if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)) {
    return null;
  }
  return { url, secret };
}

export function signMedicalReviewWebhook(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function medicalReviewWebhookBody(input: {
  certificateId: string;
  uploadedAt: Date;
}): string {
  const payload: MedicalReviewWebhookPayload = {
    event: "certificate.uploaded",
    certificate_id: input.certificateId,
    uploaded_at: input.uploadedAt.toISOString(),
  };
  return JSON.stringify(payload);
}

export async function notifyCertificateUploaded(input: {
  certificateId: string;
  uploadedAt: Date;
}): Promise<void> {
  const config = medicalReviewWebhookConfig();
  if (!config) return;
  const body = medicalReviewWebhookBody(input);
  const signature = signMedicalReviewWebhook(config.secret, body);
  try {
    await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Esl-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    logger.error("mcp.webhook_failed");
  }
}
