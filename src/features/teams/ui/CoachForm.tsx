"use client";

import { useActionState } from "react";
import { designateCoachAction } from "@/features/teams/actions";
import { staffOccupiesSlot } from "@/features/teams/domain/staff";
import type { RosterRow } from "@/features/teams/domain/roster";
import { ActionError } from "@/shared/ui/ActionError";
import { ButtonLink } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  teamId: string;
  rows: RosterRow[];
  coachRegistrationId: string | null;
  incomplete: boolean;
  coachName: string | null;
  canJoinStaff?: boolean;
};

export function CoachForm({
  teamId,
  rows,
  coachRegistrationId,
  incomplete,
  coachName,
  canJoinStaff = false,
}: Props) {
  const [state, action, pending] = useActionState(designateCoachAction, undefined);
  const eligible = rows.filter((row) => staffOccupiesSlot(row.registrationStatus));
  const selected = eligible.some((row) => row.registrationId === coachRegistrationId) ? coachRegistrationId : "";

  if (eligible.length === 0) {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {canJoinStaff ? it.coachNeedsStaff : it.coachNeedsStaffInvite}
        </p>
        <div className={fields.actions}>
          {canJoinStaff ? (
            <ButtonLink href="/area#ruolo" icon="chevronRight" iconPosition="right">
              {it.repNextCtaRole}
            </ButtonLink>
          ) : null}
          <ButtonLink href="/squadra/inviti" variant="secondary" icon="chevronRight" iconPosition="right">
            {it.repNextCtaInvite}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      {incomplete ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {it.coachMissing}
        </p>
      ) : coachName ? (
        <p className={fields.help}>
          {it.coachCurrent}: <strong>{coachName}</strong>
        </p>
      ) : null}
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state && "done" in state && state.done ? (
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.coachCurrent}
          {coachName ? `: ${coachName}` : ""}
        </p>
      ) : null}
      <div className={fields.field}>
        <label className={fields.label} htmlFor="coachRegistrationId">
          {it.categoryCoach}
        </label>
        <select
          id="coachRegistrationId"
          name="registrationId"
          className={fields.input}
          defaultValue={selected ?? ""}
          required
          disabled={pending}
        >
          <option value="">{it.coachPlaceholder}</option>
          {eligible.map((row) => (
            <option key={row.registrationId} value={row.registrationId}>
              {row.firstName} {row.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className={fields.actions}>
        <PendingSubmitButton idle={it.coachSave} pendingLabel={it.coachSaving} variant="secondary" />
      </div>
    </form>
  );
}
