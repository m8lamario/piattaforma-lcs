export const AGE_OF_MAJORITY = Number(process.env.AGE_OF_MAJORITY ?? 18);
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
export const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS ?? 14);
export const BULK_INVITE_MAX = 50;
export const TEAM_COOKIE = "eph-team";
