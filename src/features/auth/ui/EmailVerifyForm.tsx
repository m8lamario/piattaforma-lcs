"use client";

import { useActionState } from "react";
import { resendEmailVerificationAction, verifyEmailAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function VerifyEmailTokenForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, undefined);

  if (state && "done" in state && state.done) {
    return (
      <>
        <h1>{it.emailVerifyTitle}</h1>
        <p className={fields.help}>{it.emailVerifyDone}</p>
      </>
    );
  }

  return (
    <form className={fields.form} action={action}>
      <h1>{it.emailVerifyTitle}</h1>
      <p className={fields.help}>{it.emailVerifyHelp}</p>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? it.saving : it.emailVerifySubmit}
      </Button>
    </form>
  );
}

export function ResendEmailVerificationForm() {
  const [state, action, pending] = useActionState(resendEmailVerificationAction, undefined);
  return (
    <form className={fields.form} action={action}>
      <h1>{it.emailVerifyTitle}</h1>
      <p className={fields.help}>{it.emailVerifyHelp}</p>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state && "sent" in state ? <p className={fields.help}>{it.emailVerifyResent}</p> : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? it.saving : it.emailVerifyResend}
      </Button>
    </form>
  );
}
