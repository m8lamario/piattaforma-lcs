"use client";

import { useActionState } from "react";
import { redeemStaffInviteAction } from "@/features/admin/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function StaffRedeemForm({ token, needsPassword }: { token: string; needsPassword: boolean }) {
  const [state, action, pending] = useActionState(redeemStaffInviteAction, undefined);
  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      {needsPassword ? (
        <>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="staff-password">
              {it.password}
            </label>
            <input id="staff-password" name="password" type="password" required minLength={8} className={fields.input} autoComplete="new-password" />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="staff-confirm">
              {it.confirmPassword}
            </label>
            <input id="staff-confirm" name="confirmPassword" type="password" required minLength={8} className={fields.input} autoComplete="new-password" />
          </div>
        </>
      ) : null}
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.redirecting : it.joinTeam}
        </Button>
      </div>
    </form>
  );
}
