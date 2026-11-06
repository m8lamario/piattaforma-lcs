"use client";

import { useActionState } from "react";
import { startAdminViewAction } from "@/features/admin-view/actions";
import { it } from "@/shared/i18n/it";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import fields from "@/shared/ui/form.module.css";

type Props = { userId: string };

export function StartAdminViewForm({ userId }: Props) {
  const [state, action, pending] = useActionState(startAdminViewAction, undefined);

  return (
    <form className={fields.form} action={action}>
      <p>{it.adminViewHelp}</p>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="userId" value={userId} />
      <label className={fields.label}>
        <input type="checkbox" name="confirm" /> {it.adminViewConfirm}
      </label>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? it.saving : it.adminViewStart}
      </Button>
    </form>
  );
}
