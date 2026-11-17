import { NextResponse } from "next/server";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { listLeagueWorkspace } from "@/features/league/data/overview";
import { parseLeaguePlayerFilters } from "@/features/league/schemas/filters";
import { leagueExportFilename, leaguePlayersToCsv } from "@/features/league/domain/csv";
import {
  leagueCompletedAtLabel,
  leagueMedicalLabel,
  leaguePaymentLabel,
  leagueRegistrationLabel,
} from "@/features/league/domain/copy";
import { writeAuditLog } from "@/shared/lib/audit";

export async function GET(request: Request) {
  const { editionId, session } = await requireLeagueSupervisor("/lega/export/giocatori");
  const url = new URL(request.url);
  const filters = parseLeaguePlayerFilters(Object.fromEntries(url.searchParams.entries()));
  const workspace = await listLeagueWorkspace(editionId, filters);
  const csv = leaguePlayersToCsv(workspace.players, {
    status: leagueRegistrationLabel,
    medical: leagueMedicalLabel,
    payment: leaguePaymentLabel,
    completedAt: leagueCompletedAtLabel,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "LEAGUE_SUPERVISOR",
    action: "LEAGUE_EXPORT",
    entityType: "Edition",
    entityId: editionId,
    metadata: {
      kind: "giocatori",
      count: workspace.players.length,
      q: filters.q ?? null,
      schoolId: filters.schoolId ?? null,
      status: filters.status ?? null,
      medical: filters.medical ?? null,
      payment: filters.payment ?? null,
    },
  });
  const filename = leagueExportFilename("giocatori", {
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
