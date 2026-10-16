"use client";

import { useActionState } from "react";
import { designateCoachAction } from "@/features/teams/actions";
import { staffOccupiesSlot } from "@/features/teams/domain/staff";
import type { RosterRow } from "@/features/teams/domain/roster";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  teamId: string;
  rows: RosterRow[];
  coachRegistrationId: string | null;
  incomplete: boolean;
  coachName: string | null;
};

export function CoachForm({ teamId, rows, coachRegistrationId, incomplete, coachName }: Props) {
  const [state, action, pending] = useActionState(designateCoachAction, undefined);
  const eligible = rows.filter((row) => staffOccupiesSlot(row.registrationStatus));
  const selected = eligible.some((row) => row.registrationId === coachRegistrationId) ? coachRegistrationId : "";

  return (
    <section id="allenatore">
      <h2>{it.coachTitle}</h2>
      <p className={fields.help}>{it.coachHelp}</p>
      {incomplete ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {it.coachMissing}
        </p>
      ) : coachName ? (
        <p className={fields.help}>
          {it.coachCurrent}: <strong>{coachName}</strong>
        </p>
      ) : null}
      <form action={action} className={fields.form} noValidate aria-busy={pending}>
        <input type="hidden" name="teamId" value={teamId} />
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
            disabled={eligible.length === 0 || pending}
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
          <PendingSubmitButton idle={it.coachSave} pendingLabel={it.coachSaving} />
        </div>
      </form>
    </section>
  );
}
