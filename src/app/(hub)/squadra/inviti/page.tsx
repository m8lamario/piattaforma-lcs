import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeamLinkPanel } from "@/features/teams/ui/TeamLinkPanel";
import { getTeamForActor } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { TEAM_COOKIE, appOrigin } from "@/shared/config/app";
import { listTeamsByIds } from "@/features/teams/data/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { TeamSubnav } from "@/features/teams/ui/TeamSubnav";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "../page.module.css";

export default async function TeamInvitesPage() {
  const { actor, teamIds } = await requireRepresentativeTeamId();
  const jar = await cookies();
  const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
  if (!teamId) redirect("/area");

  const [team, teams] = await Promise.all([getTeamForActor(teamId), listTeamsByIds(teamIds)]);
  if (!team) redirect("/area");
  const allowed = authorize(actor, "team:invite", {
    teamId: team.id,
    competitionId: team.edition.competitionId,
  });
  if (!allowed.allow) redirect("/area");
  const editionWindow = {
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  };
  const windowOpen = isRegistrationWindowOpen(editionWindow);
  const joinUrl = `${appOrigin()}/iscrizione/${team.registrationToken}`;

  return (
    <main className={styles.main}>
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={it.invitesNav}
        description={team.name}
      />
      <TeamSubnav current="invites" />
      <TeamSwitcher teams={teams} selectedId={teamId} />
      <WindowNotice edition={editionWindow} />
      {windowOpen ? <TeamLinkPanel url={joinUrl} teamName={team.name} /> : null}
    </main>
  );
}
