"use client";

import { useActionState } from "react";
import { createTeamAction } from "@/features/admin/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  editions: { id: string; label: string }[];
};

export function TeamCreateForm({ editions }: Props) {
  const [state, action, pending] = useActionState(createTeamAction, undefined);
  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="editionId">
          {it.adminEdition}
        </label>
        <select id="editionId" name="editionId" className={fields.input} required>
          {editions.map((edition) => (
            <option key={edition.id} value={edition.id}>
              {edition.label}
            </option>
          ))}
        </select>
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="schoolName">
          {it.adminSchool}
        </label>
        <input id="schoolName" name="schoolName" className={fields.input} required />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="schoolCity">
          {it.adminCity}
        </label>
        <input id="schoolCity" name="schoolCity" className={fields.input} />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="teamName">
          {it.adminTeam}
        </label>
        <input id="teamName" name="teamName" className={fields.input} required />
      </div>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.save}
        </Button>
      </div>
    </form>
  );
}
