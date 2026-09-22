import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";
import type { Actor, ActorRole } from "./types";
import type { Role } from "./types";

export const getActorByUserId = cache(async (userId: string): Promise<Actor | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      teamMemberships: true,
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
  };
});

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
