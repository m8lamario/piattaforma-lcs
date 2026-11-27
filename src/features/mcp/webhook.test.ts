import { describe, expect, it } from "vitest";
import {
  medicalReviewWebhookBody,
  medicalReviewWebhookConfig,
  signMedicalReviewWebhook,
} from "./webhook";

describe("webhook certificato caricato", () => {
  it("resta spento senza URL e segreto", () => {
    expect(medicalReviewWebhookConfig({})).toBeNull();
    expect(
      medicalReviewWebhookConfig({
        MEDICAL_REVIEW_WEBHOOK_URL: "https://agent.example/hook",
      }),
    ).toBeNull();
  });

  it("firma il body senza nome o file", () => {
    const body = medicalReviewWebhookBody({
      certificateId: "doc_1",
      uploadedAt: new Date("2026-04-01T10:00:00.000Z"),
    });
    expect(JSON.parse(body)).toEqual({
      event: "certificate.uploaded",
      certificate_id: "doc_1",
      uploaded_at: "2026-04-01T10:00:00.000Z",
    });
    expect(body.toLowerCase()).not.toContain("mario");
    expect(signMedicalReviewWebhook("secret", body)).toHaveLength(64);
  });

  it("accetta solo https o localhost", () => {
    expect(
      medicalReviewWebhookConfig({
        MEDICAL_REVIEW_WEBHOOK_URL: "http://evil.example/hook",
        MEDICAL_REVIEW_WEBHOOK_SECRET: "secret",
      }),
    ).toBeNull();
    expect(
      medicalReviewWebhookConfig({
        MEDICAL_REVIEW_WEBHOOK_URL: "https://agent.example/hook",
        MEDICAL_REVIEW_WEBHOOK_SECRET: "secret",
      }),
    ).toMatchObject({ url: "https://agent.example/hook" });
  });
});
