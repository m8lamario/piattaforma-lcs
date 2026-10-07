import Link from "next/link";
import { TeamLinkPanel } from "@/features/teams/ui/TeamLinkPanel";
import { TeamSwitcher } from "@/features/teams/ui/TeamSwitcher";
import { RosterStrip } from "@/features/teams/ui/RosterStrip";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { PersonalRegistrationPanel } from "@/features/registrations/ui/PersonalRegistrationPanel";
import type { PlayerWorkspace } from "@/features/registrations/data/workspace";
import type { EditionWindow } from "@/features/registrations/domain/window";
import { representativeNowActions } from "@/features/teams/domain/representativeActions";
import type { RosterCounts, RosterRow } from "@/features/teams/domain/roster";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "./RepresentativeDashboard.module.css";

const ACTION_COPY: Record<string, string> = {
  attention: it.areaNowAttention,
  invited: it.areaNowInvited,
  inProgress: it.areaNowProgress,
  publication: it.areaNowPublication,
  payment: it.areaNowPayment,
  unread: it.areaNowUnread,
};

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
  teamPaymentDue: boolean;
  unreadCount: number;
  unread: UnreadItem[];
  workspace: PlayerWorkspace | null;
};

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
  teamPaymentDue,
  unreadCount,
  unread,
  workspace,
}: Props) {
  const distinctTeam = teamName.trim().toLowerCase() !== schoolName.trim().toLowerCase();
  const actions = representativeNowActions({
    counts,
    rows: roster,
    unreadCount,
    teamPaymentDue,
  });
  const location = schoolCity ? `${schoolName} · ${schoolCity}` : schoolName;

  return (
    <div className={styles.canvas}>
      <PageHeader
        kicker={`${competitionName} · ${editionName}`}
        title={schoolName}
        description={distinctTeam ? `${teamName} · ${location}` : location}
      />
      <TeamSwitcher teams={teams} selectedId={teamId} />
      <WindowNotice edition={editionWindow} />

      <section className={styles.section}>
        <h2>{it.areaTeamStatus}</h2>
        <RosterStrip counts={counts} />
      </section>

      <section className={styles.section}>
        {windowOpen ? (
          <TeamLinkPanel url={joinUrl} teamName={teamName} title={it.areaInviteTitle} help={it.areaInviteHelp}>
            <p className={styles.progress}>
              {it.areaInviteProgress.replace("{done}", String(counts.ok)).replace("{total}", String(counts.total))}
            </p>
            <p className={styles.breakdown}>
              {it.areaInviteBreakdown
                .replace("{progress}", String(counts.inProgress))
                .replace("{invited}", String(counts.invited))
                .replace("{attention}", String(counts.attention))}
            </p>
          </TeamLinkPanel>
        ) : (
          <>
            <h2>{it.areaInviteTitle}</h2>
            <p className={styles.lead}>{it.areaInviteClosed}</p>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h2>{it.areaNowTitle}</h2>
        {actions.length === 0 ? (
          <p className={`${styles.note} ${styles.ok}`}>
            {counts.total === 0 ? it.areaNowEmpty : it.areaNowOk}
          </p>
        ) : (
          <ul className={styles.actions}>
            {actions.map((action) => (
              <li key={action.id}>
                <Link href={action.href}>
                  {ACTION_COPY[action.id]?.replace("{count}", String(action.count)) ?? action.id}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unread.length > 0 ? (
        <section className={styles.section}>
          <h2>{it.navCommunications}</h2>
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
        </section>
      ) : null}

      {workspace ? (
        <PersonalRegistrationPanel
          status={workspace.projectedStatus}
          checklist={workspace.checklist}
          medicalStatus={workspace.evidence.medicalStatus}
          publication={workspace.publication}
        />
      ) : null}
    </div>
  );
}
