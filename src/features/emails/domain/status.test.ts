import { describe, expect, it } from "vitest";
import { canRetryEmail, nextEmailStatus, nextStatusFromProviderEvent, statusFromProviderEvent } from "./status";

describe("stati email", () => {
  it("mappa solo gli eventi Resend noti", () => {
    expect(statusFromProviderEvent("email.sent")).toBe("SENT");
    expect(statusFromProviderEvent("email.delivered")).toBe("DELIVERED");
    expect(statusFromProviderEvent("email.delivery_delayed")).toBe("DELIVERY_DELAYED");
    expect(statusFromProviderEvent("email.bounced")).toBe("BOUNCED");
    expect(statusFromProviderEvent("email.complained")).toBe("COMPLAINED");
    expect(statusFromProviderEvent("email.failed")).toBe("FAILED");
    expect(statusFromProviderEvent("email.opened")).toBeNull();
    expect(statusFromProviderEvent("email.clicked")).toBeNull();
  });

  it("non fa tornare indietro delivered, bounced o complained a sent", () => {
    expect(nextEmailStatus("DELIVERED", "SENT")).toBe("DELIVERED");
    expect(nextEmailStatus("BOUNCED", "SENT")).toBe("BOUNCED");
    expect(nextEmailStatus("COMPLAINED", "DELIVERED")).toBe("COMPLAINED");
    expect(nextEmailStatus("SENT", "DELIVERED")).toBe("DELIVERED");
    expect(nextEmailStatus("DELIVERED", "BOUNCED")).toBe("BOUNCED");
    expect(nextEmailStatus("QUEUED", "SENT")).toBe("SENT");
    expect(nextStatusFromProviderEvent("DELIVERED", "email.sent")).toBe("DELIVERED");
  });

  it("consente il retry solo se fallita senza id provider", () => {
    expect(canRetryEmail({ status: "FAILED", providerMessageId: null })).toBe(true);
    expect(canRetryEmail({ status: "FAILED", providerMessageId: "re_123" })).toBe(false);
    expect(canRetryEmail({ status: "SENT", providerMessageId: null })).toBe(false);
  });
});
