import { prisma } from "@/shared/lib/prisma";
import { editionTeamsToCsv, toEditionTeamRows } from "@/features/admin/domain/edition-teams";

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
  const teams = await prisma.team.findMany({
    where: { editionId },
    select: {
      id: true,
      name: true,
      contactName: true,
      contactEmail: true,
      school: { select: { name: true, city: true } },
      representative: { select: { name: true, email: true } },
      registrations: { select: { category: true, status: true } },
    },
  });
  return toEditionTeamRows(teams);
}

export async function buildEditionTeamsCsv(editionId: string) {
  const rows = await listEditionTeamsAdmin(editionId);
  return { csv: editionTeamsToCsv(rows), count: rows.length, rows };
}
