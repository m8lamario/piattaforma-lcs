export type MediaActivationRecord = {
  status: "ACTIVE" | "SUSPENDED";
  activationTokenHash: string | null;
  activationExpiresAt: Date | null;
  activatedAt: Date | null;
  userPasswordHash: string | null;
};

export type MediaActivationOutcome = "invalid" | "expired" | "used" | "already_activated" | "suspended" | "ok";

export function inspectMediaActivation(
  record: MediaActivationRecord | null,
  now = new Date(),
): MediaActivationOutcome {
  if (!record) return "invalid";
  if (record.status === "SUSPENDED") return "suspended";
  if (record.activatedAt) return "used";
  if (record.userPasswordHash) return "already_activated";
  if (!record.activationTokenHash) return "invalid";
  if (!record.activationExpiresAt || record.activationExpiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function mediaActivationErrorCode(outcome: Exclude<MediaActivationOutcome, "ok">) {
  switch (outcome) {
    case "expired":
      return "MEDIA_PARTNER_TOKEN_EXPIRED" as const;
    case "used":
      return "MEDIA_PARTNER_TOKEN_USED" as const;
    case "already_activated":
      return "MEDIA_PARTNER_ALREADY_ACTIVATED" as const;
    case "suspended":
      return "MEDIA_PARTNER_SUSPENDED" as const;
    default:
      return "MEDIA_PARTNER_TOKEN_INVALID" as const;
  }
}
