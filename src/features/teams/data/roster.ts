import { prisma } from "@/shared/lib/prisma";
import { isMinor, needsMediaAgreement } from "@/features/players/domain/age";
import { latestChoices, publicationFlags } from "@/features/consents/domain/boxes";
import { toRosterRow, toTeammateRow } from "@/features/teams/domain/roster";

export async function listTeamRoster(teamId: string) {
  const [registrations, memberships] = await Promise.all([
    prisma.registration.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: {
        playerProfile: { select: { firstName: true, lastName: true, userId: true, birthDate: true } },
        documents: {
          where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
          select: { status: true },
          take: 1,
          orderBy: { uploadedAt: "desc" },
        },
        consentChoices: { select: { code: true, accepted: true, value: true, createdAt: true } },
      },
    }),
    prisma.teamMembership.findMany({ where: { teamId } }),
  ]);

  const membershipByUser = new Map(memberships.map((row) => [row.userId, row]));

  return registrations
    .map((registration) => {
      const membership = membershipByUser.get(registration.playerProfile.userId);
      const birthDate = registration.playerProfile.birthDate;
      const isMinorPlayer = birthDate ? isMinor(birthDate) : false;
      const map = latestChoices(
        registration.consentChoices.map((row) => ({
          code: row.code,
          accepted: row.accepted,
          value: row.value,
          createdAt: row.createdAt.getTime(),
        })),
      );
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
        publication: publicationFlags({
          isMinor: isMinorPlayer,
          needsAgreement: birthDate ? needsMediaAgreement(birthDate) : false,
          map,
        }),
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
