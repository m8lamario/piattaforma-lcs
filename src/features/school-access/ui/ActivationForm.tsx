"use client";

import { useActionState } from "react";
import { activateSchoolAccessAction } from "@/features/school-access/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  token: string;
  schoolName: string;
};

export function ActivationForm({ token, schoolName }: Props) {
  const [state, action, pending] = useActionState(activateSchoolAccessAction, undefined);
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
      <p className={fields.help}>{it.schoolAccessActivateLead.replace("{school}", schoolName)}</p>
      <PasswordFields
        passwords={passwords}
        passwordId="password"
        confirmId="confirmPassword"
        hintId="activate-password-hint"
      />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.schoolAccessActivating : it.schoolAccessActivateSubmit}
        </Button>
      </div>
    </form>
  );
}
