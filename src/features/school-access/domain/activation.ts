export type ActivationRecord = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  activationTokenHash: string | null;
  activationExpiresAt: Date | null;
  activatedAt: Date | null;
  userPasswordHash: string | null;
};

export type ActivationOutcome = "invalid" | "expired" | "used" | "already_activated" | "ok";

export function inspectActivation(record: ActivationRecord | null, now = new Date()): ActivationOutcome {
  if (!record) return "invalid";
  if (record.status !== "APPROVED") return "invalid";
  if (record.activatedAt) return "used";
  if (record.userPasswordHash) return "already_activated";
  if (!record.activationTokenHash) return "invalid";
  if (!record.activationExpiresAt || record.activationExpiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function activationErrorCode(outcome: Exclude<ActivationOutcome, "ok">) {
  switch (outcome) {
    case "expired":
      return "SCHOOL_ACCESS_TOKEN_EXPIRED" as const;
    case "used":
      return "SCHOOL_ACCESS_TOKEN_USED" as const;
    case "already_activated":
      return "SCHOOL_ACCESS_ALREADY_ACTIVATED" as const;
    default:
      return "SCHOOL_ACCESS_TOKEN_INVALID" as const;
  }
}
