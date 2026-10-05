import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InvalidEmailWebhookSignatureError } from "../types";
import { mapResendWebhookPayload, verifyResendWebhookSignature } from "./resend";

function sign(secret: string, id: string, timestamp: string, body: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return `v1,${signature}`;
}

describe("webhook Resend", () => {
  const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;
  const body = JSON.stringify({
    type: "email.delivered",
    created_at: "2026-01-01T00:00:00.000Z",
    data: { email_id: "re_123", bounce: { type: "Permanent", message: "user unknown" } },
  });

  it("accetta una firma Svix valida", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const id = "msg_1";
    const headers = new Headers({
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": sign(secret, id, timestamp, body),
    });
    expect(() => verifyResendWebhookSignature({ rawBody: body, headers, secret })).not.toThrow();
  });

  it("rifiuta una firma invalida", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers = new Headers({
      "svix-id": "msg_1",
      "svix-timestamp": timestamp,
      "svix-signature": "v1,aaaa",
    });
    expect(() => verifyResendWebhookSignature({ rawBody: body, headers, secret })).toThrow(
      InvalidEmailWebhookSignatureError,
    );
  });

  it("estrae id messaggio e bounce senza salvare il payload intero", () => {
    const event = mapResendWebhookPayload(JSON.parse(body), "evt_1");
    expect(event.providerMessageId).toBe("re_123");
    expect(event.type).toBe("email.delivered");
    expect(event.bounceType).toBe("Permanent");
    expect(event.summary).toBe("user unknown");
  });
});
