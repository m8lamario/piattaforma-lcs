"use client";

import { useActionState } from "react";
import { inviteLeagueSupervisorAction } from "@/features/league/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type EditionOption = { id: string; label: string };

export function SupervisorInviteForm({
  editions,
  editionId,
}: {
  editions: EditionOption[];
  editionId?: string;
}) {
  const [state, action, pending] = useActionState(inviteLeagueSupervisorAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <p className={fields.help}>{it.adminSupervisorInviteHelp}</p>
      {editionId ? (
        <input type="hidden" name="editionId" value={editionId} />
      ) : (
        <div className={fields.field}>
          <label className={fields.label} htmlFor="league-edition">
            {it.adminSupervisorEdition}
          </label>
          <select id="league-edition" name="editionId" className={fields.input} required defaultValue="">
            <option value="">{it.adminSupervisorEdition}</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={fields.field}>
        <label className={fields.label} htmlFor="league-first-name">
          {it.firstName}
        </label>
        <input id="league-first-name" name="firstName" className={fields.input} required maxLength={80} />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="league-last-name">
          {it.lastName}
        </label>
        <input id="league-last-name" name="lastName" className={fields.input} required maxLength={80} />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="league-email">
          {it.email}
        </label>
        <input id="league-email" name="email" type="email" className={fields.input} required autoComplete="email" />
      </div>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state?.done ? (
        <p className={fields.bannerOk} role="status">
          {it.adminSupervisorInvited}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" icon="send" disabled={pending} aria-busy={pending}>
          {pending ? it.sendingInvite : it.adminSupervisorInvite}
        </Button>
      </div>
    </form>
  );
}
