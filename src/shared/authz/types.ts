export const ROLES = [
  "PLAYER",
  "TEAM_REPRESENTATIVE",
  "ORGANIZATION_ADMIN",
  "SUPER_ADMIN",
  "COMPETITION_ORGANIZER",
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
  "admin:manage",
  "platform:admin",
  "team:remove_player",
  "user:delete",
  "user:anonymize",
  "audit:delete",
] as const;

export type Action = (typeof ACTIONS)[number];

export type ActorRole = {
  role: Role;
  teamId?: string | null;
  competitionId?: string | null;
};

export type Actor = {
  userId: string;
  roles: ActorRole[];
  membershipTeamIds: string[];
};

export type Resource = {
  ownerUserId?: string;
  teamId?: string;
  competitionId?: string;
};

export type Decision = { allow: true } | { allow: false; reason: string };
