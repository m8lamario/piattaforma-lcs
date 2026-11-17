"use client";

import { useActionState } from "react";
import { changeLeagueSupervisorEditionAction } from "@/features/league/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type EditionOption = { id: string; label: string };

export function SupervisorEditionForm({
  id,
  editionId,
  editions,
}: {
  id: string;
  editionId: string;
  editions: EditionOption[];
}) {
  const [state, action, pending] = useActionState(changeLeagueSupervisorEditionAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={id} />
      <div className={fields.field}>
        <label className={fields.label} htmlFor={`league-change-edition-${id}`}>
          {it.adminSupervisorChangeEdition}
        </label>
        <select
          id={`league-change-edition-${id}`}
          name="editionId"
          className={fields.input}
          defaultValue={editionId}
        >
          {editions.map((edition) => (
            <option key={edition.id} value={edition.id}>
              {edition.label}
            </option>
          ))}
        </select>
      </div>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
          {it.adminSupervisorChangeEdition}
        </Button>
      </div>
    </form>
  );
}
