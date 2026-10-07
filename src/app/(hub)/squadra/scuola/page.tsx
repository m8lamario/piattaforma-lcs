import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeamForActor } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { TEAM_COOKIE } from "@/shared/config/app";
import { listTeamsByIds } from "@/features/teams/data/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "../page.module.css";
import school from "./page.module.css";

export default async function SchoolPage() {
  const { actor, teamIds } = await requireRepresentativeTeamId();
  const jar = await cookies();
  const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
  if (!teamId) redirect("/area");

  const [team, teams] = await Promise.all([getTeamForActor(teamId), listTeamsByIds(teamIds)]);
  if (!team) redirect("/area");
  if (
    !authorize(actor, "team:read", {
      teamId: team.id,
      competitionId: team.edition.competitionId,
    }).allow
  ) {
    redirect("/area");
  }

  const contact = [team.contactName, team.contactEmail].filter(Boolean).join(" · ");

  return (
    <main className={styles.main}>
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={it.schoolPageTitle}
        description={it.schoolPageHelp}
      />
      <TeamSwitcher teams={teams} selectedId={teamId} />

      <dl className={school.defs}>
        <div>
          <dt>{it.schoolAccessSchoolName}</dt>
          <dd>{team.school.name}</dd>
        </div>
        {team.school.city ? (
          <div>
            <dt>{it.schoolAccessCity}</dt>
            <dd>{team.school.city}</dd>
          </div>
        ) : null}
        <div>
          <dt>{it.schoolContact}</dt>
          <dd>{contact || it.schoolNoContact}</dd>
        </div>
      </dl>

      <section className={school.teams}>
        <h2>{it.schoolTeams}</h2>
        <ul>
          {teams.map((row) => (
            <li key={row.id}>
              <strong>{row.name}</strong>
              <span>
                {row.edition.competition.name} · {row.edition.name}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
