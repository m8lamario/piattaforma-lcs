import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ButtonLink } from "@/shared/ui/Button";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { listLeagueWorkspace } from "@/features/league/data/overview";
import { parseLeaguePlayerFilters } from "@/features/league/schemas/filters";
import { leagueFilterQuery } from "@/features/league/domain/query";
import { LeagueFrame } from "@/features/league/ui/LeagueFrame";
import { LeagueFilters } from "@/features/league/ui/LeagueFilters";
import { LeaguePlayerTable } from "@/features/league/ui/LeaguePlayerTable";
import { it } from "@/shared/i18n/it";
import styles from "@/features/league/ui/league.module.css";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function LeaguePlayersPage({ searchParams }: Props) {
  const query = await searchParams;
  const filters = parseLeaguePlayerFilters(query);
  const { editionId } = await requireLeagueSupervisor("/lega/giocatori");
  const workspace = await listLeagueWorkspace(editionId, filters);
  const exportQuery = leagueFilterQuery(filters);

  return (
    <LeagueFrame>
      <PageHeader
        kicker={workspace.edition ? `${workspace.edition.competition.name} · ${workspace.edition.name}` : it.navLeague}
        title={it.navLeaguePlayers}
        description={it.leaguePlayersHelp}
        actions={
          <div className={styles.actions}>
            <ButtonLink href={`/lega/export/giocatori${exportQuery}`} variant="secondary" icon="download">
              {it.leagueExportPlayers}
            </ButtonLink>
          </div>
        }
      />
      <LeagueFilters action="/lega/giocatori" filters={filters} schools={workspace.schools} />
      {workspace.players.length === 0 ? (
        <EmptyState icon="users" title={it.leagueEmptyPlayers}>
          <p>{it.leaguePlayersHelp}</p>
        </EmptyState>
      ) : (
        <LeaguePlayerTable players={workspace.players} />
      )}
    </LeagueFrame>
  );
}
