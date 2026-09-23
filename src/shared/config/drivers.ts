export function emailDriver() {
  return process.env.EMAIL_DRIVER === "resend" ? "resend" : "stub";
}

export function storageDriver() {
  if (process.env.STORAGE_DRIVER === "r2") return "r2";
  if (process.env.STORAGE_DRIVER === "stub") return "stub";
  if (process.env.STORAGE_DRIVER === "local") return "local";
  return process.env.NODE_ENV === "production" ? "stub" : "local";
}

export function paymentDriver() {
  return process.env.PAYMENT_DRIVER === "stripe" ? "stripe" : "stub";
}

export function paymentProviderName() {
  if (
    paymentDriver() === "stripe" &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  ) {
    return "stripe";
  }
  return "stub";
}

export function shouldCompletePaymentOnReturn(driver = paymentDriver()) {
  return driver === "stub";
}

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

/** S3 API base URL for Cloudflare R2 (EU buckets need `.eu.` in the hostname). */
export function r2S3Endpoint(accountId: string) {
  const custom = process.env.R2_S3_ENDPOINT?.trim();
  if (custom) return custom.replace(/\/$/, "");
  const jurisdiction = process.env.R2_JURISDICTION?.trim().toLowerCase();
  if (jurisdiction === "eu") {
    return `https://${accountId}.eu.r2.cloudflarestorage.com`;
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
