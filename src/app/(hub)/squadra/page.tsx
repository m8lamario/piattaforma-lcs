import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeamForActor } from "@/features/teams/data/invites";
import { requireRepresentativeTeamId } from "@/features/teams/actions";
import { authorize } from "@/shared/authz/authorize";
import { prisma } from "@/shared/lib/prisma";
import { TEAM_COOKIE } from "@/shared/config/app";
import { applyPendingSnapshot, decimalToCents, formatEuro, resolveTeamFee } from "@/features/payments/domain/fees";
import { TeamPaymentForm } from "@/features/payments/ui/TeamPaymentForm";
import { listTeamRoster, listTeamsByIds } from "@/features/teams/data/roster";
import { filterRoster, parseRosterFilter, splitRoster, summarizeRoster } from "@/features/teams/domain/roster";
import { STAFF_SLOT_LIMIT, teamCoachCompleteness } from "@/features/teams/domain/staff";
import { CoachForm } from "@/features/teams/ui/CoachForm";
import { LiveRefresh } from "@/features/teams/ui/LiveRefresh";
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

  const [team, teamPayment, pendingTeamPayment, roster, teams] = await Promise.all([
    getTeamForActor(teamId),
    prisma.payment.findFirst({ where: { teamId, registrationId: null, status: "SUCCEEDED" }, select: { id: true } }),
    prisma.payment.findFirst({
      where: { teamId, registrationId: null, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { amount: true },
    }),
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

  const teamFee = applyPendingSnapshot(
    decimalToCents(pendingTeamPayment?.amount),
    resolveTeamFee({
      paymentMode: team.edition.paymentMode,
      teamFeeCents: team.teamFeeCents,
      editionTeamFee: team.edition.teamFeeAmount,
    }),
  );
  const editionWindow = {
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  };
  const parts = splitRoster(roster);
  const visible = filterRoster(parts.players, filter);
  const coach = teamCoachCompleteness({
    teamId: team.id,
    coachRegistrationId: team.coachRegistrationId,
    coach: team.coachRegistration,
  });
  const coachName = coach.complete
    ? `${team.coachRegistration?.playerProfile.firstName ?? ""} ${team.coachRegistration?.playerProfile.lastName ?? ""}`.trim()
    : null;

  return (
    <main className={styles.main}>
      <LiveRefresh />
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={team.name}
        description={`${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
      />
      <TeamSubnav current={filter === "open" ? "status" : "dashboard"} />
      <TeamSwitcher teams={teams} selectedId={teamId} />
      <WindowNotice edition={editionWindow} />
      <RosterStrip counts={summarizeRoster(parts.players)} current={filter} />

      <div className={styles.teamGrid}>
        <section className={styles.rosterSection}>
          <TeamRoster
            teamId={teamId}
            rows={visible}
            emptyLabel={filter ? it.rosterFilterEmpty : undefined}
            emptyHref={filter ? "/squadra" : undefined}
          />
          <TeamRoster teamId={teamId} rows={parts.staff} variant="staff" canEditRoster />
          <p className={styles.capacity}>
            {it.staffCapacity.replace("{used}", String(parts.staffUsed)).replace("{limit}", String(STAFF_SLOT_LIMIT))}
          </p>
          <CoachForm
            teamId={teamId}
            rows={parts.staff}
            coachRegistrationId={coach.complete ? team.coachRegistrationId : null}
            incomplete={!coach.complete}
            coachName={coachName}
          />
        </section>

        {teamFee.status !== "not_due" ? (
          <aside className={styles.sideRail}>
            <div className={styles.sideCard}>
              <TeamPaymentForm
                teamId={team.id}
                covered={Boolean(teamPayment)}
                amountLabel={teamFee.status === "ready" ? formatEuro(teamFee.cents) : null}
                missing={teamFee.status === "missing"}
                currency={team.edition.currency}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
