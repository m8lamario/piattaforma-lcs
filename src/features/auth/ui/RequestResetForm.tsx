"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="email">
          {it.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={fields.input} />
      </div>
      {state?.sent ? (
        <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
          {it.forgotPasswordSent}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.forgotPasswordSubmit}
        </Button>
      </div>
    </form>
  );
}
