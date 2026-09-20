import { prisma } from "@/shared/lib/prisma";
import { toRosterRow, toTeammateRow } from "@/features/teams/domain/roster";

export async function listTeamRoster(teamId: string) {
  const [registrations, memberships] = await Promise.all([
    prisma.registration.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: {
        playerProfile: { select: { firstName: true, lastName: true, userId: true } },
        documents: {
          where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
          select: { status: true },
          take: 1,
          orderBy: { uploadedAt: "desc" },
        },
      },
    }),
    prisma.teamMembership.findMany({ where: { teamId } }),
  ]);

  const membershipByUser = new Map(memberships.map((row) => [row.userId, row]));

  return registrations
    .map((registration) => {
      const membership = membershipByUser.get(registration.playerProfile.userId);
      return toRosterRow({
        registrationId: registration.id,
        userId: registration.playerProfile.userId,
        membershipId: membership?.id,
        membershipRole: membership?.role,
        firstName: registration.playerProfile.firstName,
        lastName: registration.playerProfile.lastName,
        jerseyNumber: membership?.jerseyNumber,
        rosterRole: membership?.rosterRole,
        registrationStatus: registration.status,
        medicalStatus: registration.documents[0]?.status,
      });
    })
    .filter((row) => Boolean(row.membershipId) && row.registrationStatus !== "REMOVED");
}

export async function listTeammates(teamId: string) {
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId, role: "PLAYER" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, playerProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  return memberships
    .filter((row) => row.user.playerProfile)
    .map((row) =>
      toTeammateRow({
        userId: row.userId,
        firstName: row.user.playerProfile!.firstName,
        lastName: row.user.playerProfile!.lastName,
        jerseyNumber: row.jerseyNumber,
        rosterRole: row.rosterRole,
      }),
    );
}

export async function updateMembershipRoster(input: {
  membershipId: string;
  teamId: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
}) {
  const result = await prisma.teamMembership.updateMany({
    where: { id: input.membershipId, teamId: input.teamId },
    data: {
      jerseyNumber: input.jerseyNumber,
      rosterRole: input.rosterRole,
    },
  });
  return result.count === 1;
}

export async function listTeamsByIds(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
