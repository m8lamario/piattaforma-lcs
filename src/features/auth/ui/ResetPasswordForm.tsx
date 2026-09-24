"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
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
      <PasswordFields
        passwords={passwords}
        passwordId="password"
        confirmId="confirmPassword"
        hintId="reset-password-hint"
        passwordLabel={it.newPassword}
      />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.resetPasswordSubmit}
        </Button>
      </div>
    </form>
  );
}
