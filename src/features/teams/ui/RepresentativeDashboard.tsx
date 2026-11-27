import Link from "next/link";
import { TeamLinkPanel } from "@/features/teams/ui/TeamLinkPanel";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { WindowChip, WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { RepresentativeRegistration } from "@/features/teams/ui/RepresentativeRegistration";
import type { RepresentativeOwnRegistration } from "@/features/teams/ui/representativeOwn";
import type { EditionWindow } from "@/features/registrations/domain/window";
import {
  countRosterPendingOtherParent,
  rosterFilterHref,
  summarizeRosterCauses,
  type RosterCauseCounts,
  type RosterCounts,
  type RosterFilter,
  type RosterRow,
} from "@/features/teams/domain/roster";
import { SchoolChecklist } from "@/features/teams/ui/SchoolChecklist";
import type { SchoolChecklistItem, SchoolNextAction } from "@/features/teams/domain/schoolChecklist";
import { RepresentativeRoleForm } from "@/features/teams/ui/RepresentativeRoleForm";
import { STAFF_SLOT_LIMIT } from "@/features/teams/domain/staff";
import { ButtonLink } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { NextStepHero } from "@/shared/ui/NextStepHero";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import { ProgressMeter } from "@/shared/ui/ProgressMeter";
import { playersLabel } from "@/shared/i18n/format";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./RepresentativeDashboard.module.css";

const NEXT_COPY: Record<SchoolNextAction["id"], (action: SchoolNextAction) => string> = {
  email: () => it.repNextEmail,
  staff: () => it.repNextStaff,
  inviteStaff: () => it.repNextInviteStaff,
  coach: () => it.repNextCoach,
  teamPayment: () => it.repNextTeamPayment,
  personal: (action) => it.repNextPersonal.replace("{players}", playersLabel(action.count)),
  guardian: (action) =>
    (action.undeliverableCount > 0 ? it.repNextGuardianBounce : it.repNextGuardian).replace(
      "{players}",
      playersLabel(action.undeliverableCount > 0 ? action.undeliverableCount : action.count),
    ),
  privacy: (action) => it.repNextPrivacy.replace("{players}", playersLabel(action.count)),
  media: (action) => it.repNextMedia.replace("{players}", playersLabel(action.count)),
  playerPayment: (action) => it.repNextPlayerPayment.replace("{players}", playersLabel(action.count)),
  own: () => it.repNextOwn,
  medical: () => it.schoolChecklistMedical,
};

const PLAYER_STEPS = new Set<SchoolNextAction["id"]>(["personal", "guardian", "privacy", "media", "playerPayment"]);

function nextCta(id: SchoolNextAction["id"]) {
  if (id === "staff") return it.repNextCtaRole;
  if (id === "inviteStaff") return it.repNextCtaInvite;
  if (PLAYER_STEPS.has(id)) return it.repNextCtaPlayers;
  return it.repNextCta;
}

const STAT_TILES: { filter: RosterFilter; label: string; count: (counts: RosterCounts) => number; tone: string }[] = [
  { filter: "ok", label: it.rosterCountsOk, count: (counts) => counts.ok, tone: "ok" },
  { filter: "inProgress", label: it.rosterCountsProgress, count: (counts) => counts.inProgress, tone: "progress" },
  { filter: "invited", label: it.rosterCountsInvited, count: (counts) => counts.invited, tone: "invited" },
  { filter: "attention", label: it.rosterCountsAttention, count: (counts) => counts.attention, tone: "attention" },
];

const CAUSES: { filter: keyof RosterCauseCounts; label: string }[] = [
  { filter: "unverified", label: it.rosterFilterUnverified },
  { filter: "guardian", label: it.rosterFilterGuardian },
  { filter: "unpaid", label: it.rosterFilterUnpaid },
  { filter: "medical", label: it.rosterFilterMedical },
];

type TeamOption = { id: string; name: string; edition: { name: string; competition: { name: string } } };

type UnreadItem = { id: string; title: string; body: string };

type Props = {
  schoolName: string;
  schoolCity: string | null;
  teamName: string;
  teamId: string;
  competitionName: string;
  editionName: string;
  joinUrl: string;
  windowOpen: boolean;
  editionWindow: EditionWindow;
  counts: RosterCounts;
  roster: RosterRow[];
  teams: TeamOption[];
  unread: UnreadItem[];
  own: RepresentativeOwnRegistration | null;
  staffUsed: number;
  coachMissing: boolean;
  coachName: string | null;
  canChooseRole: boolean;
  activeCategory: "PLAYER" | "STAFF" | null;
  schoolChecklist: { items: SchoolChecklistItem[]; administrativeComplete: boolean; next: SchoolNextAction | null };
};

function NextStep({ items, administrativeComplete, next }: Props["schoolChecklist"]) {
  const admin = items.filter((item) => item.administrative);
  const done = admin.filter((item) => item.status === "complete" || item.status === "waiting_on_org").length;

  return (
    <NextStepHero
      kicker={next ? it.repNextKicker : it.schoolChecklistComplete}
      icon={next ? "zap" : "check"}
      title={next ? NEXT_COPY[next.id](next) : it.repNextDone}
      lead={next ? undefined : it.repNextDoneLead}
      actions={
        next ? (
          <>
            <ButtonLink href={next.href} icon="chevronRight" iconPosition="right">
              {nextCta(next.id)}
            </ButtonLink>
            {next.id === "staff" ? (
              <ButtonLink href="/squadra/inviti" variant="secondary" icon="chevronRight" iconPosition="right">
                {it.repNextCtaInvite}
              </ButtonLink>
            ) : null}
          </>
        ) : (
          <ButtonLink href="/squadra" variant="secondary" icon="chevronRight" iconPosition="right">
            {it.repNextCtaRoster}
          </ButtonLink>
        )
      }
      tone={
        next
          ? next.status === "attention" || next.undeliverableCount > 0
            ? "warning"
            : "default"
          : "done"
      }
      aside={
        administrativeComplete && admin.length === 0 ? undefined : (
          <ProgressMeter
            done={done}
            total={admin.length}
            size="lg"
            label={it.schoolChecklistCount.replace("{done}", String(done)).replace("{total}", String(admin.length))}
            caption={it.repNextProgress}
          />
        )
      }
    />
  );
}

export function RepresentativeDashboard({
  schoolName,
  schoolCity,
  teamName,
  teamId,
  competitionName,
  editionName,
  joinUrl,
  windowOpen,
  editionWindow,
  counts,
  roster,
  teams,
  unread,
  own,
  staffUsed,
  coachMissing,
  coachName,
  canChooseRole,
  activeCategory,
  schoolChecklist,
}: Props) {
  const distinctTeam = teamName.trim().toLowerCase() !== schoolName.trim().toLowerCase();
  const location = schoolCity ? `${schoolName} · ${schoolCity}` : schoolName;
  const causes = summarizeRosterCauses(roster);
  const activeCauses = CAUSES.filter((cause) => causes[cause.filter] > 0);
  const otherParentPending = countRosterPendingOtherParent(roster);
  return (
    <div className={styles.canvas}>
      <PageHeader
        kicker={`${competitionName} · ${editionName}`}
        title={distinctTeam ? teamName : schoolName}
        description={distinctTeam ? location : schoolCity ?? undefined}
        actions={
          <div className={styles.headerActions}>
            <WindowChip edition={editionWindow} />
            <TeamSwitcher teams={teams} selectedId={teamId} />
          </div>
        }
      />
      {windowOpen ? null : <WindowNotice edition={editionWindow} />}

      <NextStep {...schoolChecklist} />
      {otherParentPending > 0 ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {it.repOtherParentPending.replace("{players}", playersLabel(otherParentPending))}{" "}
          <Link href={rosterFilterHref("publication")}>{it.repOtherParentPendingCta}</Link>
        </p>
      ) : null}

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel
            title={schoolChecklist.administrativeComplete ? it.schoolChecklistComplete : it.repChecklistTitle}
            description={it.schoolChecklistLead}
            icon="fileCheck"
          >
            <SchoolChecklist items={schoolChecklist.items} />
          </Panel>

          {canChooseRole ? (
            <Panel id="ruolo" className={styles.anchor} icon="user">
              <RepresentativeRoleForm teamId={teamId} />
            </Panel>
          ) : (
            <Panel
              id="ruolo"
              className={styles.anchor}
              title={it.repRoleTitle}
              description={
                activeCategory && own
                  ? activeCategory === "STAFF"
                    ? it.repRoleActiveStaff
                    : it.repRoleActivePlayer
                  : it.repRoleNoneHelp
              }
              icon="user"
            >
              {activeCategory && own ? (
                <RepresentativeRegistration teamId={teamId} category={activeCategory} own={own} />
              ) : null}
            </Panel>
          )}
        </div>

        <aside className={styles.side} aria-label={it.areaTeamStatus}>
          <Panel
            title={it.repRosterPanel}
            description={
              counts.total === 0
                ? it.repRosterEmpty
                : it.repRosterLead.replace("{ok}", String(counts.ok)).replace("{total}", String(counts.total))
            }
            icon="users"
            action={
              <ButtonLink href="/squadra" variant="ghost">
                {it.repNextCtaRoster}
              </ButtonLink>
            }
          >
            <nav className={styles.tiles} aria-label={it.areaTeamStatus}>
              {STAT_TILES.map((tile) => {
                const value = tile.count(counts);
                return (
                  <Link
                    key={tile.filter}
                    href={rosterFilterHref(tile.filter)}
                    className={styles.tile}
                    data-tone={value > 0 ? tile.tone : undefined}
                  >
                    <strong>{value}</strong>
                    <span>{tile.label}</span>
                  </Link>
                );
              })}
            </nav>
            {activeCauses.length > 0 ? (
              <nav className={styles.causes} aria-label={it.rosterCauseNav}>
                <span className={styles.causesLabel}>{it.rosterCauseNav}</span>
                {activeCauses.map((cause) => (
                  <Link key={cause.filter} href={rosterFilterHref(cause.filter)} className={styles.cause}>
                    {cause.label}
                    <span>{causes[cause.filter]}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
            {counts.withdrawn > 0 ? (
              <Link href={rosterFilterHref("withdrawn")} className={styles.quietLink}>
                {it.rosterCountsWithdrawn}: {counts.withdrawn}
              </Link>
            ) : null}
            <ul className={styles.facts}>
              <li>
                <Icon name="users" size={16} />
                {it.repStaffLine.replace("{used}", String(staffUsed)).replace("{limit}", String(STAFF_SLOT_LIMIT))}
              </li>
              {coachName || coachMissing ? (
                <li data-warn={coachMissing ? "" : undefined}>
                  <Icon name={coachMissing ? "alert" : "stopwatch"} size={16} />
                  {coachName ? it.repCoachLine.replace("{name}", coachName) : it.repCoachMissingShort}
                </li>
              ) : null}
            </ul>
          </Panel>

          <Panel
            title={it.repLinkPanel}
            description={windowOpen ? it.areaInviteHelp : it.areaInviteClosed}
            icon="link"
            tone={windowOpen && counts.total === 0 ? "accent" : "default"}
          >
            {windowOpen ? <TeamLinkPanel url={joinUrl} teamName={teamName} /> : null}
            <Link href="/squadra/inviti" className={styles.quietLink}>
              {it.repLinkManage}
              <Icon name="chevronRight" size={16} />
            </Link>
          </Panel>

          {unread.length > 0 ? (
            <Panel
              title={it.repUnreadPanel}
              icon="inbox"
              flush
              action={
                <Link href="/area/comunicazioni" className={styles.quietLink}>
                  {it.repUnreadAll}
                </Link>
              }
            >
              <ul className={styles.unreadList}>
                {unread.map((item) => (
                  <li key={item.id}>
                    <Link href="/area/comunicazioni">
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
