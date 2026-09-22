export function inspectResetToken(record: { expiresAt: Date } | null, now: Date = new Date()) {
  if (!record) return "invalid" as const;
  if (record.expiresAt.getTime() <= now.getTime()) return "expired" as const;
  return "ok" as const;
}

export function passwordResetIdentifier(email: string) {
  return `password-reset:${email.trim().toLowerCase()}`;
}
