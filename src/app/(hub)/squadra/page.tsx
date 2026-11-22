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
import {
  filterRoster,
  parseRosterFilter,
  splitRoster,
  summarizeRoster,
  summarizeRosterCauses,
} from "@/features/teams/domain/roster";
import { STAFF_SLOT_LIMIT, staffOccupiesSlot, teamCoachCompleteness } from "@/features/teams/domain/staff";
import { CoachForm } from "@/features/teams/ui/CoachForm";
import { LiveRefresh } from "@/features/teams/ui/LiveRefresh";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { TeamRoster } from "@/features/teams/ui/TeamRoster";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { RosterStrip } from "@/features/teams/ui/RosterStrip";
import { WindowChip, WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import { StatusChip } from "@/shared/ui/StatusChip";
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

  const counts = summarizeRoster(parts.players);
  const windowOpen = isRegistrationWindowOpen(editionWindow);
  const own = roster.find((row) => row.userId === actor.userId);
  const canJoinStaff = !(own && staffOccupiesSlot(own.registrationStatus)) && windowOpen;

  return (
    <main className={styles.main}>
      <LiveRefresh />
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={it.rosterPageTitle}
        description={`${team.name} · ${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
        actions={
          <div className={styles.headerActions}>
            <WindowChip edition={editionWindow} />
            <TeamSwitcher teams={teams} selectedId={teamId} />
            {windowOpen ? (
              <ButtonLink href="/squadra/inviti" icon="invite">
                {it.rosterInviteCta}
              </ButtonLink>
            ) : null}
          </div>
        }
      />
      {windowOpen ? null : <WindowNotice edition={editionWindow} />}

      <div className={styles.teamGrid}>
        <div className={styles.rosterSection}>
          <RosterStrip counts={counts} causes={summarizeRosterCauses(parts.players)} current={filter} />
          <Panel
            title={it.rosterTitle}
            description={it.rosterHelp}
            icon="users"
            action={<StatusChip tone="neutral">{it.rosterPlayersCount.replace("{count}", String(counts.total))}</StatusChip>}
            flush
          >
            <TeamRoster
              teamId={teamId}
              rows={visible}
              emptyLabel={filter ? it.rosterFilterEmpty : undefined}
              emptyHref={filter ? "/squadra" : undefined}
            />
          </Panel>
          <Panel
            title={it.staffRosterTitle}
            description={it.staffRosterHelp}
            icon="stopwatch"
            action={
              <StatusChip tone={parts.staffUsed >= STAFF_SLOT_LIMIT ? "attention" : "neutral"}>
                {it.staffCapacity.replace("{used}", String(parts.staffUsed)).replace("{limit}", String(STAFF_SLOT_LIMIT))}
              </StatusChip>
            }
            flush
          >
            <TeamRoster teamId={teamId} rows={parts.staff} variant="staff" canEditRoster />
          </Panel>
        </div>

        <aside className={styles.sideRail}>
          <Panel
            id="allenatore"
            title={it.coachTitle}
            description={it.coachHelp}
            icon="stopwatch"
            tone={coach.complete ? "default" : "warning"}
          >
            <CoachForm
              teamId={teamId}
              rows={parts.staff}
              coachRegistrationId={coach.complete ? team.coachRegistrationId : null}
              incomplete={!coach.complete}
              coachName={coachName}
              canJoinStaff={canJoinStaff}
            />
          </Panel>
          {teamFee.status !== "not_due" ? (
            <Panel className={styles.sideCard}>
              <TeamPaymentForm
                teamId={team.id}
                covered={Boolean(teamPayment)}
                amountLabel={teamFee.status === "ready" ? formatEuro(teamFee.cents) : null}
                missing={teamFee.status === "missing"}
                currency={team.edition.currency}
              />
            </Panel>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
