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
import { filterRoster, parseRosterFilter, summarizeRoster } from "@/features/teams/domain/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { TeamRoster } from "@/features/teams/ui/TeamRoster";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { TeamSubnav } from "@/features/teams/ui/TeamSubnav";
import { RosterStrip } from "@/features/teams/ui/RosterStrip";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = { searchParams: Promise<{ stato?: string }> };

export default async function TeamPage({ searchParams }: Props) {
  const { actor, teamIds } = await requireRepresentativeTeamId();
  const jar = await cookies();
  const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
  if (!teamId) {
    redirect("/area");
  }

  const query = await searchParams;
  const filter = parseRosterFilter(query.stato);

  const [team, teamPayment, roster, teams] = await Promise.all([
    getTeamForActor(teamId),
    prisma.payment.findFirst({ where: { teamId, registrationId: null, status: "SUCCEEDED" } }),
    listTeamRoster(teamId),
    listTeamsByIds(teamIds),
  ]);
  if (!team) redirect("/area");
  if (
    !authorize(actor, "team:read", {
      teamId: team.id,
      competitionId: team.edition.competitionId,
    }).allow
  ) {
    redirect("/area");
  }

  const teamAmount = teamCheckoutAmount({
    paymentMode: team.edition.paymentMode,
    teamFeeAmount: team.edition.teamFeeAmount,
  });
  const editionWindow = {
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  };
  const visible = filterRoster(roster, filter);

  return (
    <main className={styles.main}>
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={team.name}
        description={`${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
      />
      <TeamSubnav current={filter === "open" ? "status" : "dashboard"} />
      <TeamSwitcher teams={teams} selectedId={teamId} />
      <WindowNotice edition={editionWindow} />
      <RosterStrip counts={summarizeRoster(roster)} current={filter} />

      <div className={styles.teamGrid}>
        <section className={styles.rosterSection}>
          <TeamRoster
            teamId={teamId}
            rows={visible}
            emptyLabel={filter ? it.rosterFilterEmpty : undefined}
            emptyHref={filter ? "/squadra" : undefined}
          />
        </section>

        {teamAmount !== null ? (
          <aside className={styles.sideRail}>
            <div className={styles.sideCard}>
              <TeamPaymentForm
                teamId={teamId}
                covered={Boolean(teamPayment)}
                amount={teamAmount}
                currency={team.edition.currency}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
