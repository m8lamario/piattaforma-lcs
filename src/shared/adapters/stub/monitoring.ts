import { logger } from "@/shared/lib/logger";
import type { MonitoringAdapter } from "../types";

export const stubMonitoringAdapter: MonitoringAdapter = {
  captureError(error, context) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.error("monitoring.stub", { message, ...context });
  },
};
