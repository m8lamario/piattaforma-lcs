import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";
import type { Actor, ActorMediaPartner, ActorRole } from "./types";
import type { Role } from "./types";

export const getActorByUserId = cache(async (userId: string): Promise<Actor | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      teamMemberships: true,
      mediaPartnerAccount: {
        include: {
          organization: {
            include: {
              competitions: { select: { competitionId: true } },
            },
          },
        },
      },
    },
  });
  if (!user || user.lifecycleStatus !== "ACTIVE") return null;

  const roles: ActorRole[] = user.roles.map((role) => ({
    role: role.role as Role,
    teamId: role.teamId,
    competitionId: role.competitionId,
  }));

  return {
    userId: user.id,
    roles,
    membershipTeamIds: user.teamMemberships.map((membership) => membership.teamId),
    mediaPartner: toMediaPartner(user.mediaPartnerAccount),
  };
});

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
