import { redirect } from "next/navigation";
import { InviteForm } from "@/features/teams/ui/InviteForm";
import { InviteList } from "@/features/teams/ui/InviteList";
import { getTeamForActor, listTeamInvites } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { isStaff } from "@/shared/authz/getActor";
import { prisma } from "@/shared/lib/prisma";
import { teamCheckoutAmount } from "@/features/payments/domain/amounts";
import { TeamPaymentForm } from "@/features/payments/ui/TeamPaymentForm";
import { listTeamRoster } from "@/features/teams/data/roster";
import { TeamRoster } from "@/features/teams/ui/TeamRoster";
import { AppShell } from "@/shared/ui/AppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import styles from "./page.module.css";

export default async function TeamPage() {
  const { actor, session, teamIds } = await requireRepresentativeTeamId();
  const teamId = teamIds[0];
  if (!teamId) {
    redirect("/area");
  }

  const allowed = authorize(actor, "team:read", { teamId });
  if (!allowed.allow) {
    redirect("/area");
  }

  const [team, invites, teamPayment, roster] = await Promise.all([
    getTeamForActor(teamId),
    listTeamInvites(teamId),
    prisma.payment.findFirst({ where: { teamId, status: "SUCCEEDED" } }),
    listTeamRoster(teamId),
  ]);
  if (!team) redirect("/area");

  const teamAmount = teamCheckoutAmount({
    paymentMode: team.edition.paymentMode,
    teamFeeAmount: team.edition.teamFeeAmount,
  });

  return (
    <AppShell email={session.user?.email} showTeam showAdmin={isStaff(actor)}>
      <main className={styles.main}>
        <PageHeader
          kicker={`${team.edition.competition.name} · ${team.edition.name}`}
          title={team.name}
          description={`${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
        />
        <TeamRoster rows={roster} />
        <InviteForm teamId={teamId} />
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
        <InviteList teamId={teamId} invites={invites} />
      </main>
    </AppShell>
  );
}
