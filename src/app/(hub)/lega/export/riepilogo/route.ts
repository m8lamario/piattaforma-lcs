import { NextResponse } from "next/server";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { listLeagueWorkspace } from "@/features/league/data/overview";
import { leagueExportFilename, leagueSummaryToCsv } from "@/features/league/domain/csv";
import { leagueSchoolStatusLabel } from "@/features/league/domain/copy";
import { writeAuditLog } from "@/shared/lib/audit";

export async function GET() {
  const { editionId, session } = await requireLeagueSupervisor("/lega/export/riepilogo");
  const workspace = await listLeagueWorkspace(editionId);
  const csv = leagueSummaryToCsv(workspace.schools, leagueSchoolStatusLabel);
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "LEAGUE_SUPERVISOR",
    action: "LEAGUE_EXPORT",
    entityType: "Edition",
    entityId: editionId,
    metadata: { kind: "riepilogo", count: workspace.schools.length },
  });
  const filename = leagueExportFilename("riepilogo", {
    competitionName: workspace.edition?.competition.name ?? "lega",
    editionName: workspace.edition?.name ?? "edizione",
  });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
