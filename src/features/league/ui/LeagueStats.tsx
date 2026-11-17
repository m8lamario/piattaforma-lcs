import { ProgressMeter } from "@/shared/ui/ProgressMeter";
import { it } from "@/shared/i18n/it";
import type { LeagueOverview } from "@/features/league/domain/status";
import styles from "./league.module.css";

export function LeagueStats({ overview }: { overview: LeagueOverview }) {
  const items = [
    { label: it.leagueStatSchools, value: overview.schoolCount },
    { label: it.leagueStatSchoolsDone, value: overview.schoolsCompleted },
    { label: it.leagueStatSchoolsOpen, value: overview.schoolsInProgress },
    { label: it.leagueStatSchoolsIssues, value: overview.schoolsWithIssues },
    { label: it.leagueStatPlayers, value: overview.playerCount },
    { label: it.leagueStatDocsOk, value: overview.docsComplete },
    { label: it.leagueStatDocsDue, value: overview.docsDue },
    { label: it.leagueStatPaymentsDue, value: overview.paymentsDue },
  ];
  return (
    <>
      <ProgressMeter
        done={overview.completedPlayers}
        total={overview.playerCount}
        size="lg"
        label={it.leagueProgressLabel}
        caption={it.leagueProgressCaption.replace("{percent}", String(overview.percent))}
      />
      <div className={styles.stats}>
        {items.map((item) => (
          <div key={item.label} className={styles.stat}>
            <span className={styles.statValue}>{item.value}</span>
            <span className={styles.statLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
