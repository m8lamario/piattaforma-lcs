"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { shirtSizeLabel } from "@/features/players/domain/shirtSize";
import { it } from "@/shared/i18n/it";
import type { RosterRow } from "@/features/teams/domain/roster";
import { nudgeRegistrationAction, updateRosterRowAction } from "@/features/teams/actions";
import { RemovePlayerForm } from "@/features/teams/ui/RemovePlayerForm";
import { ActionError } from "@/shared/ui/ActionError";
import { Avatar } from "@/shared/ui/Avatar";
import { Icon } from "@/shared/ui/Icon";
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

type Flag = { key: string; tone: StatusTone; label: string };

const TONE_RANK: Partial<Record<StatusTone, number>> = { danger: 0, attention: 1, todo: 2 };

function closed(row: RosterRow) {
  return row.registrationStatus === "WITHDRAWN" || row.registrationStatus === "REMOVED";
}

/** Open problems only, most severe first: what the representative needs to see without opening the row. */
function openFlags(row: RosterRow, staff: boolean): Flag[] {
  if (closed(row)) return [];
  const flags: Flag[] = [];
  if (staff) {
    if (row.consentDue) flags.push({ key: "consent", tone: "attention", label: it.staffConsentDue });
    if (!row.paymentCovered) flags.push({ key: "payment", tone: "todo", label: it.staffPaymentDue });
  } else {
    if (row.medicalStatus !== "approved") {
      flags.push({ key: "medical", tone: MEDICAL_TONE[row.medicalStatus], label: MEDICAL[row.medicalStatus] });
    } else if (!row.sportEligible) {
      flags.push({ key: "eligibility", tone: "attention", label: it.rosterNotEligible });
    }
    if (row.guardianEmailUndeliverable) {
      flags.push({ key: "guardian-email", tone: "danger", label: it.rosterGuardianEmailUndeliverable });
    }
    if (row.secondGuardianEmailUndeliverable) {
      flags.push({ key: "guardian-email-2", tone: "danger", label: it.rosterSecondGuardianEmailUndeliverable });
    }
    if (row.guardianState === "refused") flags.push({ key: "guardian", tone: "danger", label: it.rosterGuardianRefused });
    if (
      (row.guardianState === "pending" || row.guardianState === "none") &&
      !row.guardianEmailUndeliverable
    ) {
      flags.push({ key: "guardian", tone: "attention", label: it.rosterGuardianPending });
    }
    if (!row.emailVerified) flags.push({ key: "email", tone: "attention", label: it.rosterEmailUnverified });
    if (!row.paymentCovered) flags.push({ key: "payment", tone: "todo", label: it.rosterPaymentDue });
    if (!row.shirtSize) flags.push({ key: "shirt", tone: "attention", label: it.rosterShirtSizeMissing });
  }
  return flags.sort((a, b) => (TONE_RANK[a.tone] ?? 3) - (TONE_RANK[b.tone] ?? 3));
}

function NudgeForm({ teamId, userId }: { teamId: string; userId: string }) {
  const [state, action, pending] = useActionState(nudgeRegistrationAction, undefined);
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="userId" value={userId} />
      <PendingSubmitButton idle={it.nudge} pendingLabel={it.nudging} variant="secondary" icon="bell" disabled={pending} />
      {state && "ok" in state && state.ok ? (
        <span className={styles.sent} role="status">
          <Icon name="check" size={16} />
          {it.rosterNudgeSent}
        </span>
      ) : null}
      {state && "error" in state ? <ActionError error={state.error} code={state.code} /> : null}
    </form>
  );
}

type Props = {
  teamId: string;
  rows: RosterRow[];
  canEditRoster?: boolean;
  emptyLabel?: string;
  emptyHref?: string;
  variant?: "player" | "staff";
};

export function TeamRoster({ teamId, rows, canEditRoster = true, emptyLabel, emptyHref, variant = "player" }: Props) {
  const staff = variant === "staff";

  if (rows.length === 0) {
    return (
      <p className={styles.empty}>
        {emptyLabel ?? (staff ? it.staffRosterEmpty : it.rosterEmpty)}
        {emptyHref ? (
          <>
            {" "}
            <Link href={emptyHref}>{it.rosterFilterAll}</Link>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const flags = openFlags(row, staff);
        const visibleFlags = flags.slice(0, 2);
        const hidden = flags.length - visibleFlags.length;
        const isClosed = closed(row);
        const meta = [
          REG_COPY[row.registrationStatus] ?? row.registrationStatus,
          row.jerseyNumber ? `#${row.jerseyNumber}` : null,
          row.rosterRole,
        ]
          .filter(Boolean)
          .join(" · ");
        const canEdit = canEditRoster && row.membershipId && !staff;
        const canNudge = Boolean(row.userId) && row.registrationStatus !== "APPROVED" && row.registrationStatus !== "WITHDRAWN";
        const canRemove = canEditRoster && row.membershipId && row.membershipRole !== "REPRESENTATIVE";

        return (
          <li key={row.registrationId} className={styles.item}>
            <details className={styles.details}>
              <summary className={styles.summary}>
                <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" muted={isClosed} />
                <span className={styles.who}>
                  <strong>
                    {row.firstName} {row.lastName}
                  </strong>
                  <span className={styles.meta}>{meta}</span>
                </span>
                <span className={styles.flags}>
                  {staff && row.isCoach ? <StatusChip tone="complete">{it.categoryCoach}</StatusChip> : null}
                  {visibleFlags.map((flag) => (
                    <StatusChip key={flag.key} tone={flag.tone}>
                      {flag.label}
                    </StatusChip>
                  ))}
                  {hidden > 0 ? <span className={styles.more}>+{hidden}</span> : null}
                  {flags.length === 0 && !isClosed && (staff || row.sportEligible) ? (
                    <StatusChip tone="complete">{it.rosterAllGood}</StatusChip>
                  ) : null}
                </span>
                <span className={styles.toggle}>
                  <span className={styles.toggleLabel}>{it.rosterManage}</span>
                  <Icon name="chevronDown" size={18} className={styles.chevron} />
                </span>
              </summary>

              <div className={styles.detail}>
                <section className={styles.block}>
                  <h3>{it.rosterDetailState}</h3>
                  <div className={styles.chips}>
                    <StatusChip tone="neutral">{REG_COPY[row.registrationStatus] ?? row.registrationStatus}</StatusChip>
                    {!staff ? (
                      <StatusChip tone={row.sportEligible ? "complete" : "attention"}>
                        {row.sportEligible ? it.rosterEligible : it.rosterNotEligible}
                      </StatusChip>
                    ) : null}
                    {!staff ? (
                      <StatusChip tone={row.shirtSize ? "complete" : "attention"}>
                        {row.shirtSize
                          ? `${it.rosterShirtSize} ${shirtSizeLabel(row.shirtSize) ?? row.shirtSize}`
                          : it.rosterShirtSizeMissing}
                      </StatusChip>
                    ) : null}
                    {staff && row.isCoach ? <StatusChip tone="complete">{it.categoryCoach}</StatusChip> : null}
                    {staff && !isClosed ? (
                      <StatusChip tone={row.consentDue ? "attention" : "complete"}>
                        {row.consentDue ? it.staffConsentDue : it.staffConsentOk}
                      </StatusChip>
                    ) : null}
                    {staff && !isClosed ? (
                      <StatusChip tone={row.paymentCovered ? "complete" : "todo"}>
                        {row.paymentCovered ? it.staffPaymentOk : it.staffPaymentDue}
                      </StatusChip>
                    ) : null}
                    {!staff && !row.emailVerified ? (
                      <StatusChip tone="attention">{it.rosterEmailUnverified}</StatusChip>
                    ) : null}
                    {!staff && row.guardianEmailUndeliverable ? (
                      <StatusChip tone="danger">{it.rosterGuardianEmailUndeliverable}</StatusChip>
                    ) : null}
                    {!staff && row.secondGuardianEmailUndeliverable ? (
                      <StatusChip tone="danger">{it.rosterSecondGuardianEmailUndeliverable}</StatusChip>
                    ) : null}
                    {!staff && (row.guardianState === "pending" || row.guardianState === "none") && !row.guardianEmailUndeliverable ? (
                      <StatusChip tone="attention">{it.rosterGuardianPending}</StatusChip>
                    ) : null}
                    {!staff && row.guardianState === "refused" ? (
                      <StatusChip tone="danger">{it.rosterGuardianRefused}</StatusChip>
                    ) : null}
                    {!staff && !row.paymentCovered && row.registrationStatus !== "WITHDRAWN" ? (
                      <StatusChip tone="todo">{it.rosterPaymentDue}</StatusChip>
                    ) : null}
                    {!staff ? (
                      <StatusChip tone={MEDICAL_TONE[row.medicalStatus]}>{MEDICAL[row.medicalStatus]}</StatusChip>
                    ) : null}
                    {!staff && row.publication ? <PublicationChips flags={row.publication} compact /> : null}
                  </div>
                </section>

                {canEdit ? (
                  <section className={styles.block}>
                    <h3>{it.rosterDetailEdit}</h3>
                    <form action={updateRosterRowAction} className={styles.rosterForm}>
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="membershipId" value={row.membershipId} />
                      <div className={fields.field}>
                        <label className={fields.label} htmlFor={`jersey-${row.registrationId}`}>
                          {it.jerseyNumber}
                        </label>
                        <input
                          id={`jersey-${row.registrationId}`}
                          name="jerseyNumber"
                          className={fields.input}
                          defaultValue={row.jerseyNumber ?? ""}
                          inputMode="numeric"
                        />
                      </div>
                      <div className={fields.field}>
                        <label className={fields.label} htmlFor={`role-${row.registrationId}`}>
                          {it.rosterRole}
                        </label>
                        <input
                          id={`role-${row.registrationId}`}
                          name="rosterRole"
                          className={fields.input}
                          defaultValue={row.rosterRole ?? ""}
                        />
                      </div>
                      <PendingSubmitButton idle={it.rosterSave} pendingLabel={it.saving} variant="secondary" icon="save" />
                    </form>
                  </section>
                ) : null}

                {canNudge && row.userId ? (
                  <section className={styles.block}>
                    <h3>{it.rosterDetailReminder}</h3>
                    <p className={styles.help}>{it.rosterDetailReminderHelp}</p>
                    <NudgeForm teamId={teamId} userId={row.userId} />
                  </section>
                ) : null}

                {canRemove && row.membershipId ? (
                  <section className={`${styles.block} ${styles.dangerBlock}`}>
                    <RemovePlayerForm
                      teamId={teamId}
                      membershipId={row.membershipId}
                      lastName={row.lastName}
                      successLabel={staff ? it.lifecycleRemoveSuccessStaff : undefined}
                    />
                  </section>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
