"use client";

import { useActionState } from "react";
import { redeemStaffInviteAction } from "@/features/admin/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function StaffRedeemForm({ token, needsPassword }: { token: string; needsPassword: boolean }) {
  const [state, action, pending] = useActionState(redeemStaffInviteAction, undefined);
  const passwords = usePasswordConfirmation();

  return (
    <form
      action={action}
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={needsPassword ? passwords.onSubmit : undefined}
      onChange={needsPassword ? passwords.onChange : undefined}
    >
      <input type="hidden" name="token" value={token} />
      {needsPassword ? (
        <PasswordFields
          passwords={passwords}
          passwordId="staff-password"
          confirmId="staff-confirm"
          hintId="staff-password-hint"
        />
      ) : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.redirecting : it.joinTeam}
        </Button>
      </div>
    </form>
  );
}
