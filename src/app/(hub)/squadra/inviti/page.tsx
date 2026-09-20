import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InviteForm } from "@/features/teams/ui/InviteForm";
import { InviteList } from "@/features/teams/ui/InviteList";
import { BulkInviteForm } from "@/features/teams/ui/BulkInviteForm";
import { getTeamForActor, listTeamInvites } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { TEAM_COOKIE } from "@/shared/config/app";
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

  const allowed = authorize(actor, "team:invite", { teamId });
  if (!allowed.allow) redirect("/area");

  const [team, invites, teams] = await Promise.all([
    getTeamForActor(teamId),
    listTeamInvites(teamId),
    listTeamsByIds(teamIds),
  ]);
  if (!team) redirect("/area");
  const editionWindow = {
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  };
  const windowOpen = isRegistrationWindowOpen(editionWindow);

  return (
    <main className={styles.main}>
      <PageHeader kicker={team.name} title={it.invitesNav} />
      <TeamSubnav current="invites" />
      <TeamSwitcher teams={teams} selectedId={teamId} />
      <WindowNotice edition={editionWindow} />

      <div className={styles.invitesGrid}>
        {windowOpen ? (
          <section className={styles.formsCol}>
            <InviteForm teamId={teamId} />
            <BulkInviteForm teamId={teamId} />
          </section>
        ) : null}
        <section className={styles.listCol}>
          <InviteList teamId={teamId} invites={invites} />
        </section>
      </div>
    </main>
  );
}
