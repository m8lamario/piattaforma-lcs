import { notFound } from "next/navigation";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { getLeagueSchool } from "@/features/league/data/overview";
import { parseLeaguePlayerFilters } from "@/features/league/schemas/filters";
import { LeagueFrame } from "@/features/league/ui/LeagueFrame";
import { LeagueFilters } from "@/features/league/ui/LeagueFilters";
import { LeaguePlayerTable } from "@/features/league/ui/LeaguePlayerTable";
import { leagueSchoolStatusLabel } from "@/features/league/domain/copy";
import { it } from "@/shared/i18n/it";

type Props = {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LeagueSchoolDetailPage({ params, searchParams }: Props) {
  const { schoolId } = await params;
  const query = await searchParams;
  const filters = parseLeaguePlayerFilters(query);
  const { editionId, session } = await requireLeagueSupervisor(`/lega/scuole/${schoolId}`);
  const result = await getLeagueSchool(editionId, schoolId, session.user.id, filters);
  if (!result) notFound();

  return (
    <LeagueFrame>
      <PageHeader
        kicker={result.edition ? `${result.edition.competition.name} · ${result.edition.name}` : it.navLeagueSchools}
        title={result.school.schoolName}
        description={`${it.leagueSchoolDetailHelp} ${leagueSchoolStatusLabel(result.school.status)} · ${result.school.percent}%`}
      />
      <LeagueFilters
        action={`/lega/scuole/${schoolId}`}
        filters={filters}
        schools={result.schools}
        hideSchool
      />
      {result.players.length === 0 ? (
        <EmptyState icon="users" title={it.leagueEmptySchoolPlayers}>
          <p>{it.leagueSchoolDetailHelp}</p>
        </EmptyState>
      ) : (
        <LeaguePlayerTable players={result.players} showSchool={false} />
      )}
    </LeagueFrame>
  );
}
