import { it } from "@/shared/i18n/it";
import type { RosterRow } from "@/features/teams/domain/roster";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import styles from "./TeamRoster.module.css";

const MEDICAL: Record<RosterRow["medicalStatus"], string> = {
  none: it.rosterMedicalNone,
  pending: it.rosterMedicalPending,
  approved: it.rosterMedicalApproved,
  rejected: it.rosterMedicalRejected,
  expired: it.rosterMedicalExpired,
};

const MEDICAL_TONE: Record<RosterRow["medicalStatus"], StatusTone> = {
  none: "todo",
  pending: "attention",
  approved: "complete",
  rejected: "danger",
  expired: "danger",
};

const REG_COPY: Record<string, string> = {
  INVITED: it.statusINVITED,
  ACCOUNT_CREATED: it.statusACCOUNT_CREATED,
  IN_PROGRESS: it.statusIN_PROGRESS,
  PENDING_REVIEW: it.statusPENDING_REVIEW,
  CHANGES_REQUESTED: it.statusCHANGES_REQUESTED,
  PAYMENT_PENDING: it.statusPAYMENT_PENDING,
  APPROVED: it.statusAPPROVED,
  WITHDRAWN: it.statusWITHDRAWN,
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
        <p className={styles.empty}>{it.rosterEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.registrationId} className={styles.item}>
              <strong>
                {row.firstName} {row.lastName}
              </strong>
              <span className={styles.chips}>
                <StatusChip tone="neutral">{REG_COPY[row.registrationStatus] ?? row.registrationStatus}</StatusChip>
                <StatusChip tone={MEDICAL_TONE[row.medicalStatus]}>{MEDICAL[row.medicalStatus]}</StatusChip>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
