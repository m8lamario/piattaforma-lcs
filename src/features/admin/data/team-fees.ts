import { Prisma } from "@generated/client";
import { centsToDecimalString, decimalToCents } from "@/features/payments/domain/fees";
import { prisma } from "@/shared/lib/prisma";

export async function getEditionFeeBoard(editionId: string) {
  const edition = await prisma.edition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      name: true,
      currency: true,
      playerFeeAmount: true,
      staffFeeAmount: true,
      teamFeeAmount: true,
      competition: { select: { name: true } },
      teams: {
        select: {
          id: true,
          name: true,
          playerFeeCents: true,
          staffFeeCents: true,
          teamFeeCents: true,
          school: { select: { name: true, city: true } },
        },
      },
    },
  });
  if (!edition) return null;
  const teams = edition.teams
    .map((team) => ({
      id: team.id,
      teamName: team.name,
      schoolName: team.school.name,
      schoolCity: team.school.city ?? "",
      playerFeeCents: team.playerFeeCents,
      staffFeeCents: team.staffFeeCents,
      teamFeeCents: team.teamFeeCents,
    }))
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName, "it") || a.teamName.localeCompare(b.teamName, "it"));
  return {
    id: edition.id,
    name: edition.name,
    currency: edition.currency,
    competitionName: edition.competition.name,
    defaults: {
      playerFeeCents: decimalToCents(edition.playerFeeAmount),
      staffFeeCents: decimalToCents(edition.staffFeeAmount),
      teamFeeCents: decimalToCents(edition.teamFeeAmount),
    },
    teams,
  };
}

function decimalOrNull(cents: number | null) {
  return cents === null ? null : new Prisma.Decimal(centsToDecimalString(cents));
}

export async function saveEditionDefaultFees(input: {
  editionId: string;
  playerFeeCents: number | null;
  staffFeeCents: number;
  teamFeeCents: number | null;
}) {
  return prisma.edition.update({
    where: { id: input.editionId },
    data: {
      playerFeeAmount: decimalOrNull(input.playerFeeCents),
      staffFeeAmount: new Prisma.Decimal(centsToDecimalString(input.staffFeeCents)),
      teamFeeAmount: decimalOrNull(input.teamFeeCents),
    },
    select: { id: true },
  });
}

export async function saveTeamFeeOverrides(input: {
  editionId: string;
  teamId: string;
  playerFeeCents: number | null;
  staffFeeCents: number | null;
  teamFeeCents: number | null;
}) {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { id: true, editionId: true, playerFeeCents: true, staffFeeCents: true, teamFeeCents: true },
  });
  if (!team || team.editionId !== input.editionId) return null;
  const updated = await prisma.team.update({
    where: { id: team.id },
    data: {
      playerFeeCents: input.playerFeeCents,
      staffFeeCents: input.staffFeeCents,
      teamFeeCents: input.teamFeeCents,
    },
    select: { id: true },
  });
  return { previous: team, updated };
}
