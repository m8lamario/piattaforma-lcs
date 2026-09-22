import { stubEmailAdapter } from "./stub/email";
import { stubMonitoringAdapter } from "./stub/monitoring";
import { stubPaymentAdapter } from "./stub/payments";
import { stubStorageAdapter } from "./stub/storage";
import { localStorageAdapter } from "./local/storage";
import { createResendEmailAdapter } from "./live/resend";
import { createR2StorageAdapter } from "./live/r2";
import { createStripePaymentAdapter } from "./live/stripe";
import {
  emailDriver,
  paymentDriver,
  r2Configured,
  resendConfigured,
  storageDriver,
  stripeConfigured,
} from "@/shared/config/drivers";
import { logger } from "@/shared/lib/logger";
import type { EmailAdapter, MonitoringAdapter, PaymentAdapter, StorageAdapter } from "./types";

function createEmailAdapter(): EmailAdapter {
  if (emailDriver() === "resend") {
    if (resendConfigured()) return createResendEmailAdapter();
    logger.warn("email.resend.incomplete");
  }
  return stubEmailAdapter;
}

function createStorageAdapter(): StorageAdapter {
  const driver = storageDriver();
  if (driver === "r2") {
    if (r2Configured()) return createR2StorageAdapter();
    logger.warn("storage.r2.incomplete");
    return process.env.NODE_ENV === "production" ? stubStorageAdapter : localStorageAdapter;
  }
  if (driver === "local") return localStorageAdapter;
  return stubStorageAdapter;
}

function createPaymentAdapter(): PaymentAdapter {
  if (paymentDriver() === "stripe") {
    if (stripeConfigured()) return createStripePaymentAdapter();
    logger.warn("payment.stripe.incomplete");
  }
  return stubPaymentAdapter;
}

export const emailAdapter: EmailAdapter = createEmailAdapter();
export const storageAdapter: StorageAdapter = createStorageAdapter();
export const paymentAdapter: PaymentAdapter = createPaymentAdapter();
export const monitoringAdapter: MonitoringAdapter = stubMonitoringAdapter;
