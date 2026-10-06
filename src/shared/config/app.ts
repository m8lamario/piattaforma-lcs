export const AGE_OF_MAJORITY = Number(process.env.AGE_OF_MAJORITY ?? 18);
export const AGE_OF_MEDIA_AGREEMENT = Number(process.env.AGE_OF_MEDIA_AGREEMENT ?? 14);
export const MIN_REGISTRATION_AGE = 14;
export const C1_TOKEN_DAYS = Number(process.env.C1_TOKEN_DAYS ?? 60);
export const C1_REMINDER_DAYS = Number(process.env.C1_REMINDER_DAYS ?? 14);
export const GUARDIAN_LINK_DAYS = Number(process.env.GUARDIAN_LINK_DAYS ?? 7);
export const GUARDIAN_REMINDER_DAYS = Number(process.env.GUARDIAN_REMINDER_DAYS ?? 3);
export const EMAIL_VERIFY_HOURS = Number(process.env.EMAIL_VERIFY_HOURS ?? 24);
export const MEDICAL_RETENTION_DAYS = Number(process.env.MEDICAL_RETENTION_DAYS ?? 90);
export const MARKETING_OPTIN_DAYS = Number(process.env.MARKETING_OPTIN_DAYS ?? 30);
export const SIGNED_URL_TTL_SECONDS = Number(
  process.env.SIGNED_URL_TTL_SECONDS ?? 60,
);
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760);

export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const APP_NAME = "ESL Player Hub";

export function appOrigin() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS ?? 14);
export const BULK_INVITE_MAX = 50;
export const TEAM_COOKIE = "eph-team";
