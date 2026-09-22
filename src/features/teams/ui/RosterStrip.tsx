import { it } from "@/shared/i18n/it";
import type { RosterCounts } from "@/features/teams/domain/roster";
import styles from "./TeamRoster.module.css";

export function RosterStrip({ counts }: { counts: RosterCounts }) {
  return (
    <div className={styles.strip} role="status">
      <p>
        <strong>{counts.invited}</strong>
        <span>{it.rosterCountsInvited}</span>
      </p>
      <p>
        <strong>{counts.inProgress}</strong>
        <span>{it.rosterCountsProgress}</span>
      </p>
      <p>
        <strong>{counts.attention}</strong>
        <span>{it.rosterCountsAttention}</span>
      </p>
      <p>
        <strong>{counts.ok}</strong>
        <span>{it.rosterCountsOk}</span>
      </p>
      <p>
        <strong>{counts.withdrawn}</strong>
        <span>{it.rosterCountsWithdrawn}</span>
      </p>
    </div>
  );
}
