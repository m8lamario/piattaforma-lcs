"use client";

import { useActionState } from "react";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ActionFailure } from "@/shared/errors";

type ConfirmAction = (
  prev: ActionFailure | undefined,
  formData: FormData,
) => Promise<ActionFailure | { done?: boolean } | undefined>;

type Props = {
  token: string;
  action: ConfirmAction;
  title: string;
  help: string;
  submit: string;
  done: string;
};

export function TokenConfirmForm({ token, action, title, help, submit, done }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state && "done" in state && state.done) {
    return (
      <>
        <h1>{title}</h1>
        <p className={fields.help}>{done}</p>
      </>
    );
  }
  return (
    <form className={fields.form} action={formAction}>
      <h1>{title}</h1>
      <p className={fields.help}>{help}</p>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? it.saving : submit}
      </Button>
    </form>
  );
}
