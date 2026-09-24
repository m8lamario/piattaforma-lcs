"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function AccountPasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const passwords = usePasswordConfirmation({ passwordName: "newPassword" });

  return (
    <form
      action={action}
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={passwords.onSubmit}
      onChange={passwords.onChange}
    >
      <div className={fields.field}>
        <label className={fields.label} htmlFor="currentPassword">
          {it.currentPassword}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className={fields.input}
        />
      </div>
      <PasswordFields
        passwords={passwords}
        passwordId="newPassword"
        confirmId="confirmPassword"
        hintId="account-password-hint"
        passwordName="newPassword"
        passwordLabel={it.newPassword}
      />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state?.ok ? (
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.passwordChanged}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.changePassword}
        </Button>
      </div>
    </form>
  );
}
