export const EMAIL_TEMPLATE_KEYS = [
  "player-invite",
  "staff-invite",
  "password-reset",
  "EMAIL_VERIFY",
  "GUARDIAN_AUTHORIZE",
  "GUARDIAN_AUTHORIZED",
  "GUARDIAN_REFUSED",
  "MEDIA_REVOKE_INTERNAL",
  "REGISTRATION_RECEIVED",
  "REGISTRATION_APPROVED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "CONSENT_C1",
  "CONSENT_MARKETING_OPTIN",
  "PAYMENT_SUCCEEDED",
  "REGISTRATION_WITHDRAWN",
  "REGISTRATION_REMINDER",
  "LEGAL_VERSION_NOTICE",
  "SCHOOL_ACCESS_APPROVED",
  "SCHOOL_ACCESS_REJECTED",
  "SCHOOL_ACCESS_INTERNAL",
  "MANUAL",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const EMAIL_PURPOSE_KEYS = [
  ...EMAIL_TEMPLATE_KEYS,
] as const;

export type EmailPurpose = (typeof EMAIL_PURPOSE_KEYS)[number];

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export const MANUAL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  "MANUAL",
  "LEGAL_VERSION_NOTICE",
  "REGISTRATION_REMINDER",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "REGISTRATION_RECEIVED",
  "REGISTRATION_APPROVED",
];
