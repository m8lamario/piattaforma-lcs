export function emailVerifyIdentifier(email: string) {
  return `email-verify:${email.trim().toLowerCase()}`;
}

export function inspectEmailVerifyToken(record: { expiresAt: Date } | null, now: Date = new Date()) {
  if (!record) return "invalid" as const;
  if (record.expiresAt.getTime() <= now.getTime()) return "expired" as const;
  return "ok" as const;
}
