import { it } from "@/shared/i18n/it";
import type { RosterRow } from "@/features/teams/domain/roster";
import { nudgeRegistrationAction, updateRosterRowAction } from "@/features/teams/actions";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import fields from "@/shared/ui/form.module.css";
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
  teamId: string;
  rows: RosterRow[];
  canEditRoster?: boolean;
};

export function TeamRoster({ teamId, rows, canEditRoster = true }: Props) {
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
                {row.jerseyNumber ? ` · ${row.jerseyNumber}` : ""}
                {row.rosterRole ? ` · ${row.rosterRole}` : ""}
              </strong>
              <span className={styles.chips}>
                <StatusChip tone="neutral">{REG_COPY[row.registrationStatus] ?? row.registrationStatus}</StatusChip>
                <StatusChip tone={MEDICAL_TONE[row.medicalStatus]}>{MEDICAL[row.medicalStatus]}</StatusChip>
              </span>
              {canEditRoster && row.membershipId ? (
                <form action={updateRosterRowAction} className={styles.rosterForm}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="membershipId" value={row.membershipId} />
                  <input
                    name="jerseyNumber"
                    className={fields.input}
                    defaultValue={row.jerseyNumber ?? ""}
                    aria-label={it.jerseyNumber}
                    placeholder={it.jerseyNumber}
                  />
                  <input
                    name="rosterRole"
                    className={fields.input}
                    defaultValue={row.rosterRole ?? ""}
                    aria-label={it.rosterRole}
                    placeholder={it.rosterRole}
                  />
                  <PendingSubmitButton idle={it.rosterSave} pendingLabel={it.saving} variant="ghost" />
                </form>
              ) : null}
              {row.userId && row.registrationStatus !== "APPROVED" && row.registrationStatus !== "WITHDRAWN" ? (
                <form action={nudgeRegistrationAction}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="userId" value={row.userId} />
                  <PendingSubmitButton idle={it.nudge} pendingLabel={it.nudging} variant="ghost" />
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
