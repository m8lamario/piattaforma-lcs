import { prisma } from "@/shared/lib/prisma";
import { isMinor, needsMediaAgreement } from "@/features/players/domain/age";
import { latestChoices, publicationFlags } from "@/features/consents/domain/boxes";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { staffOccupiesSlot } from "@/features/teams/domain/staff";
import { toRosterRow, toTeammateRow } from "@/features/teams/domain/roster";

export async function listTeamRoster(teamId: string) {
  const [team, registrations, memberships] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        coachRegistrationId: true,
        edition: { select: { paymentMode: true } },
        payments: {
          where: { registrationId: null, status: "SUCCEEDED" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.registration.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: {
        playerProfile: { select: { firstName: true, lastName: true, userId: true, birthDate: true, shirtSize: true } },
        documents: {
          where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
          select: { status: true },
          take: 1,
          orderBy: { uploadedAt: "desc" },
        },
        payments: { select: { status: true } },
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
      const isStaff = registration.category === "STAFF";
      return toRosterRow({
        registrationId: registration.id,
        userId: registration.playerProfile.userId,
        membershipId: membership?.id,
        membershipRole: membership?.role,
        category: registration.category,
        firstName: registration.playerProfile.firstName,
        lastName: registration.playerProfile.lastName,
        jerseyNumber: membership?.jerseyNumber,
        rosterRole: membership?.rosterRole,
        shirtSize: isStaff ? null : registration.playerProfile.shirtSize,
        registrationStatus: registration.status,
        medicalStatus: isStaff ? null : registration.documents[0]?.status,
        paymentCovered: isPaymentCovered({
          mode: team?.edition.paymentMode ?? "PLAYER",
          playerSucceeded: registration.payments.some((payment) => payment.status === "SUCCEEDED"),
          teamSucceeded: Boolean(team?.payments.length),
        }),
        consentDue:
          isStaff &&
          (registration.status === "INVITED" ||
            registration.status === "ACCOUNT_CREATED" ||
            registration.status === "IN_PROGRESS"),
        isCoach:
          isStaff &&
          registration.id === team?.coachRegistrationId &&
          staffOccupiesSlot(registration.status),
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
  const membership = await prisma.teamMembership.findFirst({
    where: { id: input.membershipId, teamId: input.teamId },
    select: { role: true },
  });
  if (!membership) return false;
  const staff = membership.role === "STAFF";
  const result = await prisma.teamMembership.updateMany({
    where: { id: input.membershipId, teamId: input.teamId },
    data: {
      jerseyNumber: staff ? null : input.jerseyNumber,
      rosterRole: staff ? null : input.rosterRole,
    },
  });
  return result.count === 1;
}

export async function listTeamsByIds(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      edition: { select: { name: true, competition: { select: { name: true } } } },
    },
  });
}
