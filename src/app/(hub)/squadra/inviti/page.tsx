import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeamLinkPanel } from "@/features/teams/ui/TeamLinkPanel";
import { getTeamForActor, listTeamInvites } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { TEAM_COOKIE, appOrigin } from "@/shared/config/app";
import { listTeamsByIds } from "@/features/teams/data/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { loadUserEmailDeliveries, USER_EMAIL_OPS } from "@/features/emails/data/userDelivery";
import { InviteForm } from "@/features/teams/ui/InviteForm";
import { InviteList } from "@/features/teams/ui/InviteList";
import { BulkInviteForm } from "@/features/teams/ui/BulkInviteForm";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { WindowChip, WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { Disclosure } from "@/shared/ui/Disclosure";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default async function TeamInvitesPage() {
  const { actor, teamIds } = await requireRepresentativeTeamId();
  const jar = await cookies();
  const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
  if (!teamId) redirect("/area");

  const [team, teams, invites] = await Promise.all([
    getTeamForActor(teamId),
    listTeamsByIds(teamIds),
    listTeamInvites(teamId),
  ]);
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
  const deliveries = await loadUserEmailDeliveries(
    invites.map((invite) => USER_EMAIL_OPS.playerInvite(teamId, invite.email)),
  );
  const inviteRows = invites.map((invite) => {
    const delivery = deliveries.get(invite.email.trim().toLowerCase());
    return {
      ...invite,
      deliveryState: delivery?.state ?? ("not_sent" as const),
      remainingResends: delivery?.remainingResends ?? 0,
      contactSupport: delivery?.contactSupport ?? false,
      resendAvailableAt: delivery?.resendAvailableAt?.toISOString() ?? null,
    };
  });

  const pendingCount = invites.filter((invite) => invite.status === "PENDING").length;

  return (
    <main className={styles.main}>
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={it.invitesPageTitle}
        description={windowOpen ? it.invitesPageLead : team.name}
        actions={
          <div className={styles.headerActions}>
            <WindowChip edition={editionWindow} />
            <TeamSwitcher teams={teams} selectedId={teamId} />
          </div>
        }
      />
      {windowOpen ? null : <WindowNotice edition={editionWindow} />}
      <div className={styles.grid}>
        {windowOpen ? (
          <div className={styles.column}>
            <Panel
              title={it.teamLinkTitle}
              description={it.invitesLinkLead.replace("{team}", team.name)}
              icon="link"
              tone="accent"
            >
              <TeamLinkPanel url={joinUrl} teamName={team.name} />
            </Panel>
            <Panel title={it.invitesEmailPanel} description={it.teamInviteHelp} icon="mail">
              <InviteForm teamId={teamId} />
              <Disclosure summary={it.invitesCsvToggle} icon="upload" variant="boxed">
                <BulkInviteForm teamId={teamId} />
              </Disclosure>
            </Panel>
          </div>
        ) : null}
        <Panel
          title={it.invitesSentPanel}
          description={pendingCount > 0 ? it.invitesSentCount.replace("{count}", String(pendingCount)) : undefined}
          icon="send"
        >
          <InviteList teamId={teamId} invites={inviteRows} />
        </Panel>
      </div>
    </main>
  );
}
