import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { listLeagueWorkspace } from "@/features/league/data/overview";
import { LeagueFrame } from "@/features/league/ui/LeagueFrame";
import { LeagueSchoolList } from "@/features/league/ui/LeagueSchoolList";
import { it } from "@/shared/i18n/it";

export default async function LeagueSchoolsPage() {
  const { editionId } = await requireLeagueSupervisor("/lega/scuole");
  const workspace = await listLeagueWorkspace(editionId);

  return (
    <LeagueFrame>
      <PageHeader
        kicker={workspace.edition ? `${workspace.edition.competition.name} · ${workspace.edition.name}` : it.navLeague}
        title={it.navLeagueSchools}
        description={it.leagueSchoolsHelp}
      />
      {workspace.schools.length === 0 ? (
        <EmptyState icon="org" title={it.leagueEmptySchools}>
          <p>{it.leagueSchoolsHelp}</p>
        </EmptyState>
      ) : (
        <LeagueSchoolList schools={workspace.schools} />
      )}
    </LeagueFrame>
  );
}
