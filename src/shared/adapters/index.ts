import { stubEmailAdapter } from "./stub/email";
import { stubMonitoringAdapter } from "./stub/monitoring";
import { stubPaymentAdapter } from "./stub/payments";
import { stubStorageAdapter } from "./stub/storage";
import { localStorageAdapter } from "./local/storage";
import type {
  EmailAdapter,
  MonitoringAdapter,
  PaymentAdapter,
  StorageAdapter,
} from "./types";

const storageDriver =
  process.env.STORAGE_DRIVER ?? (process.env.NODE_ENV === "production" ? "stub" : "local");

export const emailAdapter: EmailAdapter = stubEmailAdapter;
export const storageAdapter: StorageAdapter =
  storageDriver === "local" ? localStorageAdapter : stubStorageAdapter;
export const paymentAdapter: PaymentAdapter = stubPaymentAdapter;
export const monitoringAdapter: MonitoringAdapter = stubMonitoringAdapter;
