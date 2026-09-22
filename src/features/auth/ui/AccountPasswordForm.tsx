"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function AccountPasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
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
      <div className={fields.field}>
        <label className={fields.label} htmlFor="newPassword">
          {it.newPassword}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fields.input}
        />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="confirmPassword">
          {it.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fields.input}
        />
      </div>
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
