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

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
