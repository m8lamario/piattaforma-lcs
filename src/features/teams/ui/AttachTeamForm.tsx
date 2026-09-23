"use client";

import { useActionState } from "react";
import { attachTeamLinkAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function AttachTeamForm({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; code?: string } | undefined, formData: FormData) =>
      attachTeamLinkAction(formData),
    undefined,
  );

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>{it.attachInviteLead.replace("{team}", teamName)}</p>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.attachingInvite : it.joinTeam}
        </Button>
      </div>
    </form>
  );
}
