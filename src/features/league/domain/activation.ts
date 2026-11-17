export type LeagueActivationRecord = {
  status: "ACTIVE" | "SUSPENDED";
  activationTokenHash: string | null;
  activationExpiresAt: Date | null;
  activatedAt: Date | null;
  userPasswordHash: string | null;
};

export type LeagueActivationOutcome = "invalid" | "expired" | "used" | "already_activated" | "suspended" | "ok";

export function inspectLeagueActivation(
  record: LeagueActivationRecord | null,
  now = new Date(),
): LeagueActivationOutcome {
  if (!record) return "invalid";
  if (record.status === "SUSPENDED") return "suspended";
  if (record.activatedAt) return "used";
  if (record.userPasswordHash) return "already_activated";
  if (!record.activationTokenHash) return "invalid";
  if (!record.activationExpiresAt || record.activationExpiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function leagueActivationErrorCode(outcome: Exclude<LeagueActivationOutcome, "ok">) {
  switch (outcome) {
    case "expired":
      return "LEAGUE_TOKEN_EXPIRED" as const;
    case "used":
      return "LEAGUE_TOKEN_USED" as const;
    case "already_activated":
      return "LEAGUE_ALREADY_ACTIVATED" as const;
    case "suspended":
      return "LEAGUE_SUSPENDED" as const;
    default:
      return "LEAGUE_TOKEN_INVALID" as const;
  }
}
