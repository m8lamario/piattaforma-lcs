"use client";

import { useActionState } from "react";
import { attachInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function AttachInviteForm({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return attachInviteAction(formData);
    },
    undefined,
  );

  return (
    <form action={action} className={fields.form} aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>{it.attachInviteLead.replace("{team}", teamName)}</p>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.attachingInvite : it.joinTeam}
        </Button>
      </div>
    </form>
  );
}
