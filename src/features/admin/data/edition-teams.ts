import { prisma } from "@/shared/lib/prisma";
import { editionTeamsToCsv, toEditionTeamRowsFromCounts } from "@/features/admin/domain/edition-teams";

export async function getEditionExportMeta(editionId: string) {
  return prisma.edition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      name: true,
      year: true,
      competition: { select: { name: true } },
    },
  });
}

export async function listEditionTeamsAdmin(editionId: string) {
  const [teams, groups] = await Promise.all([
    prisma.team.findMany({
      where: { editionId },
      select: {
        id: true,
        name: true,
        contactName: true,
        contactEmail: true,
        school: { select: { name: true, city: true } },
        representative: { select: { name: true, email: true } },
      },
    }),
    prisma.registration.groupBy({
      by: ["teamId", "category", "status"],
      where: { editionId },
      _count: { _all: true },
    }),
  ]);
  return toEditionTeamRowsFromCounts(
    teams,
    groups.map((group) => ({
      teamId: group.teamId,
      category: group.category,
      status: group.status,
      count: group._count._all,
    })),
  );
}

export async function buildEditionTeamsCsv(editionId: string) {
  const rows = await listEditionTeamsAdmin(editionId);
  return { csv: editionTeamsToCsv(rows), count: rows.length, rows };
}
