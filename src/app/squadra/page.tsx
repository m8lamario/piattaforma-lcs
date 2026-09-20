import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeamForActor } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { prisma } from "@/shared/lib/prisma";
import { TEAM_COOKIE } from "@/shared/config/app";
import { teamCheckoutAmount } from "@/features/payments/domain/amounts";
import { TeamPaymentForm } from "@/features/payments/ui/TeamPaymentForm";
import { listTeamRoster, listTeamsByIds } from "@/features/teams/data/roster";
import { summarizeRoster } from "@/features/teams/domain/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { TeamRoster } from "@/features/teams/ui/TeamRoster";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { TeamSubnav } from "@/features/teams/ui/TeamSubnav";
import { RosterStrip } from "@/features/teams/ui/RosterStrip";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { AppShell } from "@/shared/ui/AppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import styles from "./page.module.css";

export default async function TeamPage() {
  const { actor, session, teamIds } = await requireRepresentativeTeamId();
  const jar = await cookies();
  const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
  if (!teamId) {
    redirect("/area");
  }

  const allowed = authorize(actor, "team:read", { teamId });
  if (!allowed.allow) {
    redirect("/area");
  }

  const [team, teamPayment, roster, teams, shell] = await Promise.all([
    getTeamForActor(teamId),
    prisma.payment.findFirst({ where: { teamId, status: "SUCCEEDED" } }),
    listTeamRoster(teamId),
    listTeamsByIds(teamIds),
    loadAppShell(session.user!.id),
  ]);
  if (!team) redirect("/area");

  const teamAmount = teamCheckoutAmount({
    paymentMode: team.edition.paymentMode,
    teamFeeAmount: team.edition.teamFeeAmount,
  });
  const editionWindow = {
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  };

  return (
    <AppShell
      email={session.user?.email}
      showTeam
      showAdmin={shell.showAdmin}
      showPlayerTeam={shell.showPlayerTeam}
      unreadCount={shell.unreadCount}
    >
      <main className={styles.main}>
        <PageHeader
          kicker={`${team.edition.competition.name} · ${team.edition.name}`}
          title={team.name}
          description={`${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
        />
        <TeamSubnav current="dashboard" />
        <TeamSwitcher teams={teams} selectedId={teamId} />
        <WindowNotice edition={editionWindow} />
        <RosterStrip counts={summarizeRoster(roster)} />
        <TeamRoster teamId={teamId} rows={roster} />
        {teamAmount !== null ? (
          <section className={styles.panel}>
            <TeamPaymentForm
              teamId={teamId}
              covered={Boolean(teamPayment)}
              amount={teamAmount}
              currency={team.edition.currency}
            />
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
