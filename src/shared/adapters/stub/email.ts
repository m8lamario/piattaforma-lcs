import { logger } from "@/shared/lib/logger";
import type { EmailAdapter } from "../types";

export const stubEmailAdapter: EmailAdapter = {
  async send(input) {
    logger.info("email.stub.send", { template: input.template, to: "[redacted]" });
  },
};
