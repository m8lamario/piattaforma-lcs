"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { SUPPORT_EMAIL } from "@/shared/config/app";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  const [now, setNow] = useState(() => Date.now());
  const until = state?.resendAvailableAt ? new Date(state.resendAvailableAt).getTime() : 0;
  const remainingSeconds = until > now ? Math.ceil((until - now) / 1000) : 0;

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="email">
          {it.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={fields.input} />
      </div>
      {state?.sent && !state.exhausted && !state.cooldown ? (
        <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
          {it.forgotPasswordSent}
        </p>
      ) : null}
      {state?.cooldown ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {it.forgotPasswordResendWait.replace("{seconds}", String(Math.max(remainingSeconds, 1)))}
        </p>
      ) : null}
      {typeof state?.remainingResends === "number" && !state.exhausted ? (
        <p className={fields.help}>{it.forgotPasswordRemaining.replace("{count}", String(state.remainingResends))}</p>
      ) : null}
      {state?.exhausted ? (
        <p className={`${fields.banner} ${fields.bannerDanger}`} role="status">
          {it.forgotPasswordExhausted.replace("{email}", SUPPORT_EMAIL)}
        </p>
      ) : null}
      <p className={fields.help}>{it.termsPointerResponsibility}</p>
      <div className={fields.actions}>
        <Button
          type="submit"
          disabled={pending || remainingSeconds > 0 || Boolean(state?.exhausted)}
          aria-busy={pending}
        >
          {pending
            ? it.saving
            : remainingSeconds > 0
              ? it.forgotPasswordResendWait.replace("{seconds}", String(remainingSeconds))
              : it.forgotPasswordSubmit}
        </Button>
      </div>
    </form>
  );
}
