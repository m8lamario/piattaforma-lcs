"use client";

import { useActionState } from "react";
import { submitInviteTokenAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function TokenEntryForm() {
  const [state, action, pending] = useActionState(submitInviteTokenAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <p className={fields.help}>{it.invitePasteHelp}</p>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="invite-token">
          {it.invitePasteLabel}
        </label>
        <input
          id="invite-token"
          name="token"
          className={fields.input}
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.verifyingInvite : it.invitePasteSubmit}
        </Button>
      </div>
    </form>
  );
}
