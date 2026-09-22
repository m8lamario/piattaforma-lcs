"use client";

import { useActionState, useState } from "react";
import { removePlayerAction } from "@/features/teams/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./TeamRoster.module.css";

type Props = {
  teamId: string;
  membershipId: string;
  lastName: string;
};

export function RemovePlayerForm({ teamId, membershipId, lastName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(removePlayerAction, undefined);
  const expected = lastName.trim() || it.lifecycleRemoveConfirmWord;

  if (state && "ok" in state && state.ok) {
    return (
      <p className={fields.bannerOk} role="status">
        {it.lifecycleRemoveSuccess}
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="danger" icon="trash" onClick={() => setOpen(true)}>
        {it.lifecycleRemoveOpen}
      </Button>
    );
  }

  return (
    <form action={action} className={styles.removeForm} noValidate aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <p className={fields.bannerDanger}>{it.lifecycleRemoveHelp}</p>
      <p className={fields.help}>{it.lifecycleRemoveConsequences}</p>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={`remove-confirm-${membershipId}`}>
          {it.lifecycleRemoveConfirmLabel.replace("{name}", expected)}
        </label>
        <input
          id={`remove-confirm-${membershipId}`}
          name="confirm"
          className={fields.input}
          autoComplete="off"
          required
          disabled={pending}
        />
      </div>
      {state && "error" in state && state.error ? (
        <ActionError error={state.error} code={"code" in state ? state.code : undefined} />
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" variant="danger" icon="trash" disabled={pending} aria-busy={pending}>
          {pending ? it.lifecycleRemoving : it.lifecycleRemoveSubmit}
        </Button>
        <Button type="button" variant="ghost" icon="close" disabled={pending} onClick={() => setOpen(false)}>
          {it.lifecycleCancel}
        </Button>
      </div>
    </form>
  );
}
