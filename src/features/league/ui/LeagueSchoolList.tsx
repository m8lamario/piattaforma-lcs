import Link from "next/link";
import { StatusChip } from "@/shared/ui/StatusChip";
import { ProgressMeter } from "@/shared/ui/ProgressMeter";
import { it } from "@/shared/i18n/it";
import type { LeagueSchoolRecord } from "@/features/league/domain/status";
import { leagueSchoolStatusLabel } from "@/features/league/domain/copy";
import styles from "./league.module.css";

function tone(status: LeagueSchoolRecord["status"]) {
  if (status === "completed") return "complete" as const;
  if (status === "issues") return "danger" as const;
  if (status === "empty") return "neutral" as const;
  return "attention" as const;
}

function issueLabel(issue: LeagueSchoolRecord["issues"][number]) {
  if (issue === "medical") return it.leagueIssueMedical;
  if (issue === "changes") return it.leagueIssueChanges;
  return it.leagueIssuePayment;
}

export function LeagueSchoolList({ schools }: { schools: LeagueSchoolRecord[] }) {
  return (
    <div className={styles.cards}>
      {schools.map((school) => (
        <Link key={school.schoolId} href={`/lega/scuole/${school.schoolId}`} className={styles.card}>
          <div className={styles.cardHead}>
            <strong>{school.schoolName}</strong>
            <StatusChip tone={tone(school.status)}>{leagueSchoolStatusLabel(school.status)}</StatusChip>
          </div>
          {school.teamNames.length > 1 ? (
            <p className={styles.cardMeta}>{school.teamNames.join(" · ")}</p>
          ) : null}
          <div className={styles.counts}>
            <span>
              {it.leaguePlayerCount}: {school.playerCount}
            </span>
            <span>
              {it.leaguePlayerDone}: {school.completedCount}
            </span>
            <span>
              {it.leaguePlayerOpen}: {school.incompleteCount}
            </span>
          </div>
          <ProgressMeter
            done={school.completedCount}
            total={school.playerCount}
            label={`${school.schoolName}: ${school.percent}%`}
            caption={`${school.percent}%`}
          />
          <p className={styles.cardMeta}>
            {school.issues.length > 0
              ? `${it.leagueIssues}: ${school.issues.map(issueLabel).join(", ")}`
              : it.leagueNoIssues}
          </p>
        </Link>
      ))}
    </div>
  );
}
