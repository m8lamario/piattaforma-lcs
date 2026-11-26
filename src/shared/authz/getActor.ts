import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";
import type { Actor, ActorMediaPartner, ActorRole } from "./types";
import type { Role } from "./types";

const userAccessSelect = {
  id: true,
  lifecycleStatus: true,
  roles: { select: { role: true, teamId: true, competitionId: true } },
  teamMemberships: { select: { teamId: true } },
  leagueSupervisor: { select: { editionId: true, status: true, activatedAt: true } },
  mediaPartnerAccount: {
    select: {
      id: true,
      mediaPartnerId: true,
      status: true,
      organization: {
        select: {
          name: true,
          status: true,
          competitions: { select: { competitionId: true } },
        },
      },
    },
  },
  playerProfile: {
    select: {
      registrations: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { id: true },
      },
    },
  },
} as const;

export const loadUserAccess = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userAccessSelect,
  });
  if (!user || user.lifecycleStatus !== "ACTIVE") return null;

  const roles: ActorRole[] = user.roles.map((role) => ({
    role: role.role as Role,
    teamId: role.teamId,
    competitionId: role.competitionId,
  }));

  const actor: Actor = {
    userId: user.id,
    roles,
    membershipTeamIds: user.teamMemberships.map((membership) => membership.teamId),
    mediaPartner: toMediaPartner(user.mediaPartnerAccount),
    leagueEditionId: toLeagueEditionId(user.leagueSupervisor),
  };
  return {
    actor,
    hasPlayerRegistration: Boolean(user.playerProfile?.registrations[0]),
  };
});

export const getActorByUserId = cache(async (userId: string): Promise<Actor | null> => {
  return (await loadUserAccess(userId))?.actor ?? null;
});

function toLeagueEditionId(
  account: {
    editionId: string;
    status: "ACTIVE" | "SUSPENDED";
    activatedAt: Date | null;
  } | null,
) {
  if (!account || account.status !== "ACTIVE" || !account.activatedAt) return null;
  return account.editionId;
}

function toMediaPartner(
  account: {
    id: string;
    mediaPartnerId: string;
    status: "ACTIVE" | "SUSPENDED";
    organization: {
      name: string;
      status: "ACTIVE" | "SUSPENDED";
      competitions: { competitionId: string }[];
    };
  } | null,
): ActorMediaPartner | null {
  if (!account) return null;
  const grantsActive = account.status === "ACTIVE" && account.organization.status === "ACTIVE";
  return {
    accountId: account.id,
    organizationId: account.mediaPartnerId,
    organizationName: account.organization.name,
    accountStatus: account.status,
    organizationStatus: account.organization.status,
    competitionIds: grantsActive ? account.organization.competitions.map((row) => row.competitionId) : [],
  };
}

export function representativeTeamIds(actor: Actor) {
  return actor.roles
    .filter((role) => role.role === "TEAM_REPRESENTATIVE" && role.teamId)
    .map((role) => role.teamId as string);
}

export function isStaff(actor: Actor) {
  return actor.roles.some(
    (role) => role.role === "ORGANIZATION_ADMIN" || role.role === "SUPER_ADMIN",
  );
}

export function isMedicalReviewer(actor: Actor) {
  return actor.roles.some((role) => role.role === "MEDICAL_REVIEWER" || role.role === "SUPER_ADMIN");
}

export function isSuperAdmin(actor: Actor) {
  return actor.roles.some((role) => role.role === "SUPER_ADMIN");
}

export function isMediaPartner(actor: Actor) {
  return Boolean(actor.mediaPartner) || actor.roles.some((role) => role.role === "MEDIA_PARTNER");
}

export function isLeagueSupervisorRole(actor: Actor) {
  return actor.roles.some((role) => role.role === "LEAGUE_SUPERVISOR");
}

export function isActiveLeagueSupervisor(actor: Actor) {
  return isLeagueSupervisorRole(actor) && Boolean(actor.leagueEditionId);
}

export function deniedHome(actor: Actor) {
  if (isLeagueSupervisorRole(actor)) return "/lega";
  return "/area";
}
