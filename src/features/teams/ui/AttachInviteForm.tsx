"use client";

import { useActionState } from "react";
import { attachInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import styles from "./RedeemForm.module.css";

export function AttachInviteForm({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return attachInviteAction(formData);
    },
    undefined,
  );

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <p className={styles.lead}>
        Conferma per unirti a <strong>{teamName}</strong>.
      </p>
      {state?.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Collegamento…" : "Unisciti alla squadra"}
      </Button>
    </form>
  );
}
