"use client";

import { useActionState } from "react";
import { activateLeagueSupervisorAction } from "@/features/league/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function SupervisorActivationForm({ token, editionTitle }: { token: string; editionTitle: string }) {
  const [state, action, pending] = useActionState(activateLeagueSupervisorAction, undefined);
  const passwords = usePasswordConfirmation();

  return (
    <form
      action={action}
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={passwords.onSubmit}
      onChange={passwords.onChange}
    >
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>{it.leagueActivateLead.replace("{edition}", editionTitle)}</p>
      <PasswordFields
        passwords={passwords}
        passwordId="password"
        confirmId="confirmPassword"
        hintId="league-activate-password-hint"
      />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.leagueActivating : it.leagueActivateSubmit}
        </Button>
      </div>
    </form>
  );
}
