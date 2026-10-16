"use client";

import { useActionState } from "react";
import { joinRepresentativeAsStaffAction } from "@/features/teams/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function JoinAsStaffForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(joinRepresentativeAsStaffAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <h2>{it.repStaffTitle}</h2>
      <p className={fields.help}>{it.repStaffLead}</p>
      <input type="hidden" name="teamId" value={teamId} />
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state && "done" in state && state.done ? (
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.repStaffJoined}
        </p>
      ) : (
        <div className={fields.actions}>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? it.saving : it.repStaffJoin}
          </Button>
        </div>
      )}
    </form>
  );
}
