import type { Action, Actor, Decision, Resource } from "./types";

function deny(reason: string): Decision {
  return { allow: false, reason };
}

function isSuperAdmin(actor: Actor) {
  return actor.roles.some((role) => role.role === "SUPER_ADMIN");
}

function isOrgAdmin(actor: Actor) {
  return actor.roles.some((role) => role.role === "ORGANIZATION_ADMIN");
}

function isMedicalReviewer(actor: Actor) {
  return actor.roles.some((role) => role.role === "MEDICAL_REVIEWER");
}

function isTeamRepFor(actor: Actor, teamId?: string) {
  if (!teamId) return false;
  return actor.roles.some(
    (role) => role.role === "TEAM_REPRESENTATIVE" && role.teamId === teamId,
  );
}

function isPlayerOwner(actor: Actor, ownerUserId?: string) {
  return Boolean(ownerUserId) && actor.userId === ownerUserId;
}

function isTeamMember(actor: Actor, teamId?: string) {
  return typeof teamId === "string" && actor.membershipTeamIds.includes(teamId);
}

function isCompetitionOrganizerFor(actor: Actor, competitionId?: string) {
  if (!competitionId) return false;
  return actor.roles.some(
    (role) => role.role === "COMPETITION_ORGANIZER" && role.competitionId === competitionId,
  );
}

const SUPER_ONLY: Action[] = ["platform:admin", "user:delete", "user:anonymize", "email:compose"];
const ORG_ADMIN_DENIED: Action[] = [...SUPER_ONLY, "document:read_file", "document:review"];

export function authorize(
  actor: Actor,
  action: Action,
  resource: Resource = {},
): Decision {
  if (action === "audit:delete") {
    return deny("L’audit non si cancella da questa interfaccia.");
  }

  if (isSuperAdmin(actor)) {
    return { allow: true };
  }

  if (isOrgAdmin(actor)) {
    if (ORG_ADMIN_DENIED.includes(action)) {
      return deny(
        action === "document:read_file" || action === "document:review"
          ? "Il file del certificato è riservato al revisore."
          : "Solo Super Admin può gestire la piattaforma.",
      );
    }
    return { allow: true };
  }

  if (isMedicalReviewer(actor)) {
    if (
      action === "document:read_file" ||
      action === "document:review" ||
      action === "document:read_status" ||
      action === "registration:read"
    ) {
      return { allow: true };
    }
    return deny("Questo ruolo può solo revisionare i certificati.");
  }

  switch (action) {
    case "platform:admin":
    case "admin:manage":
    case "document:review":
    case "staff:invite":
    case "email:read":
    case "email:send":
    case "email:compose":
    case "user:delete":
    case "user:anonymize":
      return deny("Permesso negato.");
    case "team:invite":
    case "team:update_roster":
    case "team:remove_player":
    case "payment:create_team":
      return isTeamRepFor(actor, resource.teamId)
        ? { allow: true }
        : deny("Solo il rappresentante della squadra può eseguire questa azione.");
    case "team:read":
      if (isTeamRepFor(actor, resource.teamId) || isTeamMember(actor, resource.teamId)) {
        return { allow: true };
      }
      if (isCompetitionOrganizerFor(actor, resource.competitionId)) {
        return { allow: true };
      }
      return deny("Non puoi vedere questa squadra.");
    case "registration:read":
      if (isPlayerOwner(actor, resource.ownerUserId)) return { allow: true };
      if (isTeamRepFor(actor, resource.teamId)) return { allow: true };
      return deny("Non puoi vedere questa registrazione.");
    case "registration:write":
    case "payment:create_player":
      return isPlayerOwner(actor, resource.ownerUserId)
        ? { allow: true }
        : deny("Puoi modificare solo la tua registrazione.");
    case "registration:withdraw":
      return isPlayerOwner(actor, resource.ownerUserId)
        ? { allow: true }
        : deny("Puoi ritirare solo la tua iscrizione.");
    case "document:read_status":
      if (isPlayerOwner(actor, resource.ownerUserId)) return { allow: true };
      if (isTeamRepFor(actor, resource.teamId)) return { allow: true };
      return deny("Non puoi vedere lo stato di questo documento.");
    case "document:read_file":
      return isPlayerOwner(actor, resource.ownerUserId)
        ? { allow: true }
        : deny("Il file del certificato non è disponibile per questo ruolo.");
    default:
      return deny("Azione sconosciuta.");
  }
}

export function canSeeDocumentFile(actor: Actor, resource: Resource) {
  return authorize(actor, "document:read_file", resource).allow;
}
