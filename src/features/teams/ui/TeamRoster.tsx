import { it } from "@/shared/i18n/it";
import type { RosterRow } from "@/features/teams/domain/roster";
import styles from "./TeamRoster.module.css";

const MEDICAL: Record<RosterRow["medicalStatus"], string> = {
  none: it.rosterMedicalNone,
  pending: it.rosterMedicalPending,
  approved: it.rosterMedicalApproved,
  rejected: it.rosterMedicalRejected,
  expired: it.rosterMedicalExpired,
};

type Props = {
  rows: RosterRow[];
};

export function TeamRoster({ rows }: Props) {
  return (
    <section className={styles.wrap}>
      <h2>{it.rosterTitle}</h2>
      <p className={styles.help}>{it.rosterHelp}</p>
      {rows.length === 0 ? (
        <p>{it.rosterEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.registrationId} className={styles.item}>
              <strong>
                {row.firstName} {row.lastName}
              </strong>
              <span>
                {row.registrationStatus} · {MEDICAL[row.medicalStatus]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
