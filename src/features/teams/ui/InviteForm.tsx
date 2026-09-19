"use client";

import { useActionState, useState } from "react";
import { createInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./InviteForm.module.css";

export function InviteForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createInviteAction, undefined);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  if (state?.redeemUrl && state.redeemUrl !== savedUrl) {
    setSavedUrl(state.redeemUrl);
  }
  const redeemUrl = state?.redeemUrl ?? savedUrl;
  const copied = Boolean(redeemUrl && copiedUrl === redeemUrl);

  async function copyLink() {
    if (!redeemUrl) return;
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopiedUrl(redeemUrl);
    } catch {
      setCopiedUrl(null);
    }
  }

  return (
    <section className={styles.card}>
      <h2>{it.teamInviteTitle}</h2>
      <p>{it.teamInviteHelp}</p>
      <form action={action} className={styles.form} noValidate>
        <input type="hidden" name="teamId" value={teamId} />
        <label htmlFor="invite-email">{it.email}</label>
        <input id="invite-email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="invite-first">{it.firstName}</label>
        <input id="invite-first" name="firstName" autoComplete="given-name" />
        <label htmlFor="invite-last">{it.lastName}</label>
        <input id="invite-last" name="lastName" autoComplete="family-name" />
        {state?.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Invio in corso…" : it.sendInvite}
        </Button>
      </form>
      {redeemUrl ? (
        <div className={styles.success} role="status">
          <p>{copied ? it.copied : it.inviteCreated}</p>
          <code className={styles.url}>{redeemUrl}</code>
          <Button type="button" variant="accent" onClick={copyLink}>
            {copied ? "Copiato" : it.copyLink}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
