import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ButtonLink } from "@/shared/ui/Button";
import { requireLeagueAccount, requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { listLeagueWorkspace } from "@/features/league/data/overview";
import { LeagueFrame } from "@/features/league/ui/LeagueFrame";
import { LeagueStats } from "@/features/league/ui/LeagueStats";
import { LeagueSchoolList } from "@/features/league/ui/LeagueSchoolList";
import { it } from "@/shared/i18n/it";
import styles from "@/features/league/ui/league.module.css";

export default async function LeagueOverviewPage() {
  const { actor } = await requireLeagueAccount("/lega");
  if (!actor.leagueEditionId) {
    const suspended = actor.roles.some((role) => role.role === "LEAGUE_SUPERVISOR");
    return (
      <LeagueFrame>
        <EmptyState icon="org" title={suspended ? it.leagueSuspendedTitle : it.leaguePendingTitle}>
          <p>{suspended ? it.leagueSuspendedLead : it.leaguePendingLead}</p>
        </EmptyState>
      </LeagueFrame>
    );
  }

  const { editionId } = await requireLeagueSupervisor("/lega");
  const workspace = await listLeagueWorkspace(editionId);
  const title = workspace.edition
    ? `${workspace.edition.competition.name} · ${workspace.edition.name}`
    : it.leagueTitle;

  return (
    <LeagueFrame>
      <PageHeader
        kicker={it.navLeague}
        title={title}
        description={it.leagueOverviewHelp}
        actions={
          <div className={styles.actions}>
            <ButtonLink href="/lega/export/riepilogo" variant="secondary" icon="download">
              {it.leagueExportSummary}
            </ButtonLink>
            <ButtonLink href="/lega/export/giocatori" variant="secondary" icon="download">
              {it.leagueExportPlayers}
            </ButtonLink>
          </div>
        }
      />
      <LeagueStats overview={workspace.overview} />
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
