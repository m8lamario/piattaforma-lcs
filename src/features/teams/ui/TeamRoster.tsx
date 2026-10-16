import Link from "next/link";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { it } from "@/shared/i18n/it";
import type { RosterRow } from "@/features/teams/domain/roster";
import { nudgeRegistrationAction, updateRosterRowAction } from "@/features/teams/actions";
import { RemovePlayerForm } from "@/features/teams/ui/RemovePlayerForm";
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
  REMOVED: it.statusREMOVED,
};

type Props = {
  teamId: string;
  rows: RosterRow[];
  canEditRoster?: boolean;
  emptyLabel?: string;
  emptyHref?: string;
  title?: string;
  help?: string;
  variant?: "player" | "staff";
};

export function TeamRoster({
  teamId,
  rows,
  canEditRoster = true,
  emptyLabel,
  emptyHref,
  title,
  help,
  variant = "player",
}: Props) {
  const staff = variant === "staff";
  return (
    <section className={styles.wrap}>
      <h2>{title ?? (staff ? it.staffRosterTitle : it.rosterTitle)}</h2>
      <p className={styles.help}>{help ?? (staff ? it.staffRosterHelp : it.rosterHelp)}</p>
      {rows.length === 0 ? (
        <p className={styles.empty}>
          {emptyLabel ?? it.rosterEmpty}
          {emptyHref ? (
            <>
              {" "}
              <Link href={emptyHref}>{it.rosterFilterAll}</Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.registrationId} className={styles.item}>
              <div className={styles.itemLeft}>
                <strong>
                  {row.firstName} {row.lastName}
                  {row.jerseyNumber ? ` · ${row.jerseyNumber}` : ""}
                  {row.rosterRole ? ` · ${row.rosterRole}` : ""}
                </strong>
                <span className={styles.chips}>
                  <StatusChip tone="neutral">{REG_COPY[row.registrationStatus] ?? row.registrationStatus}</StatusChip>
                  {staff && row.isCoach ? <StatusChip tone="complete">{it.categoryCoach}</StatusChip> : null}
                  {staff && row.registrationStatus !== "WITHDRAWN" && row.registrationStatus !== "REMOVED" ? (
                    <StatusChip tone={row.consentDue ? "attention" : "complete"}>
                      {row.consentDue ? it.staffConsentDue : it.staffConsentOk}
                    </StatusChip>
                  ) : null}
                  {!staff ? (
                    <StatusChip tone={MEDICAL_TONE[row.medicalStatus]}>{MEDICAL[row.medicalStatus]}</StatusChip>
                  ) : null}
                  {staff && row.registrationStatus !== "WITHDRAWN" && row.registrationStatus !== "REMOVED" ? (
                    <StatusChip tone={row.paymentCovered ? "complete" : "todo"}>
                      {row.paymentCovered ? it.staffPaymentOk : it.staffPaymentDue}
                    </StatusChip>
                  ) : null}
                  {!staff && row.publication ? <PublicationChips flags={row.publication} compact /> : null}
                </span>
              </div>
              <div className={styles.itemRight}>
                {canEditRoster && row.membershipId && !staff ? (
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
                    <PendingSubmitButton idle={it.rosterSave} pendingLabel={it.saving} variant="primary" icon="save" />
                  </form>
                ) : null}
                {row.userId && row.registrationStatus !== "APPROVED" && row.registrationStatus !== "WITHDRAWN" ? (
                  <form action={nudgeRegistrationAction} className={styles.nudgeForm}>
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="userId" value={row.userId} />
                    <PendingSubmitButton idle={it.nudge} pendingLabel={it.nudging} variant="ghost" icon="bell" />
                  </form>
                ) : null}
                {canEditRoster && row.membershipId && row.membershipRole !== "REPRESENTATIVE" ? (
                  <RemovePlayerForm
                    teamId={teamId}
                    membershipId={row.membershipId}
                    lastName={row.lastName}
                    successLabel={staff ? it.lifecycleRemoveSuccessStaff : undefined}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
