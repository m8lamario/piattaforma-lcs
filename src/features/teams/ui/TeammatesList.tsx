import type { TeammateRow } from "@/features/teams/domain/roster";
import { Avatar } from "@/shared/ui/Avatar";
import { it } from "@/shared/i18n/it";
import styles from "./TeammatesList.module.css";

export function TeammatesList({ rows }: { rows: TeammateRow[] }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{it.teammatesEmpty}</p>;
  }
  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const name = `${row.firstName} ${row.lastName}`;
        return (
          <li key={row.userId} className={styles.item}>
            <Avatar name={name} />
            <span className={styles.name}>{name}</span>
            {row.rosterRole ? <span className={styles.role}>{row.rosterRole}</span> : null}
            {row.jerseyNumber ? (
              <span className={styles.jersey}>
                <span className="srOnly">{it.jerseyNumber} </span>
                {row.jerseyNumber}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
