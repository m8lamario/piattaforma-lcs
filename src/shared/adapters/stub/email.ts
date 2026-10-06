import { logger } from "@/shared/lib/logger";
import { InvalidEmailWebhookSignatureError, type EmailAdapter } from "../types";

export const stubEmailAdapter: EmailAdapter = {
  provider: "stub",
  async send(input) {
    logger.info("email.stub.send", { template: input.tags?.template ?? "unknown", to: "[redacted]" });
    return { providerMessageId: null };
  },
  async parseWebhook() {
    throw new InvalidEmailWebhookSignatureError();
  },
};
