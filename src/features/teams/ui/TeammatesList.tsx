import type { TeammateRow } from "@/features/teams/domain/roster";
import { it } from "@/shared/i18n/it";
import styles from "@/features/teams/ui/TeamRoster.module.css";

export function TeammatesList({ rows }: { rows: TeammateRow[] }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{it.teammatesEmpty}</p>;
  }
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.userId} className={styles.item}>
          <strong>
            {row.firstName} {row.lastName}
          </strong>
          <span className={styles.help}>
            {[row.jerseyNumber, row.rosterRole].filter(Boolean).join(" · ") || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
