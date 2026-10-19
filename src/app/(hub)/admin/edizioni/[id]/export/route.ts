import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { buildEditionTeamsCsv, getEditionExportMeta } from "@/features/admin/data/edition-teams";
import { editionTeamsExportFilename } from "@/features/admin/domain/edition-teams";
import { requireStaff } from "@/shared/authz/requireStaff";
import { writeAuditLog } from "@/shared/lib/audit";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const { session } = await requireStaff(`/admin/edizioni/${id}/export`);
  const edition = await getEditionExportMeta(id);
  if (!edition) notFound();

  const register = await buildEditionTeamsCsv(edition.id);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EDITION_TEAMS_EXPORT",
    entityType: "Edition",
    entityId: edition.id,
    metadata: { count: register.count },
  });

  const filename = editionTeamsExportFilename({
    competitionName: edition.competition.name,
    editionName: edition.name,
    year: edition.year,
  });

  return new NextResponse(register.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
