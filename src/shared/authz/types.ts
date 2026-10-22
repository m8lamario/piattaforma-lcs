export const ROLES = [
  "PLAYER",
  "TEAM_REPRESENTATIVE",
  "ORGANIZATION_ADMIN",
  "MEDICAL_REVIEWER",
  "SUPER_ADMIN",
  "COMPETITION_ORGANIZER",
  "MEDIA_PARTNER",
] as const;

export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "registration:read",
  "registration:write",
  "document:read_status",
  "document:read_file",
  "document:review",
  "team:invite",
  "team:read",
  "team:update_roster",
  "registration:withdraw",
  "staff:invite",
  "payment:create_player",
  "payment:create_team",
  "payment:record_transfer",
  "fee:manage",
  "admin:manage",
  "platform:admin",
  "team:remove_player",
  "user:delete",
  "user:anonymize",
  "audit:delete",
  "email:read",
  "email:send",
  "email:compose",
  "media:manage",
  "media:verify",
] as const;

export type Action = (typeof ACTIONS)[number];

export type ActorRole = {
  role: Role;
  teamId?: string | null;
  competitionId?: string | null;
};

export type ActorMediaPartner = {
  accountId: string;
  organizationId: string;
  organizationName: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
  organizationStatus: "ACTIVE" | "SUSPENDED";
  competitionIds: string[];
};

export type Actor = {
  userId: string;
  roles: ActorRole[];
  membershipTeamIds: string[];
  mediaPartner?: ActorMediaPartner | null;
};

export type Resource = {
  ownerUserId?: string;
  teamId?: string;
  competitionId?: string;
};

export type Decision = { allow: true } | { allow: false; reason: string };
