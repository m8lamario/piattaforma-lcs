"use client";

import { useActionState } from "react";
import { notifyStaleLegalVersionAction } from "@/features/emails/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function LegalVersionNoticeForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(notifyStaleLegalVersionAction, undefined);
  return (
    <form action={action} className={fields.form}>
      <input type="hidden" name="slug" value={slug} />
      <p>{it.adminLegalNotifyHelp}</p>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={`confirm-${slug}`}>
          {it.adminLegalNotifyConfirm}
        </label>
        <input id={`confirm-${slug}`} name="confirm" className={fields.input} autoComplete="off" />
      </div>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state && "sent" in state ? (
        <p role="status">
          {it.adminEmailsLegalQueued.replace("{sent}", String(state.sent)).replace("{failed}", String(state.failed ?? 0))}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {it.adminLegalNotify}
      </Button>
    </form>
  );
}
