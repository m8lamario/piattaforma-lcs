"use client";

import { useActionState } from "react";
import { submitInviteTokenAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./RedeemForm.module.css";

export function TokenEntryForm() {
  const [state, action, pending] = useActionState(submitInviteTokenAction, undefined);

  return (
    <form action={action} className={styles.form} noValidate>
      <p className={styles.lead}>{it.invitePasteHelp}</p>
      <label htmlFor="invite-token">{it.invitePasteLabel}</label>
      <input
        id="invite-token"
        name="token"
        type="text"
        required
        autoComplete="off"
        spellCheck={false}
        placeholder="https://…/invito/…"
      />
      {state?.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Verifica in corso…" : it.invitePasteSubmit}
      </Button>
    </form>
  );
}
