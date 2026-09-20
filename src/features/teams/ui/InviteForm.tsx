"use client";

import { useActionState, useState } from "react";
import { createInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
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
      <form action={action} className={fields.form} noValidate aria-busy={pending}>
        <input type="hidden" name="teamId" value={teamId} />
        <div className={fields.field}>
          <label className={fields.label} htmlFor="invite-email">
            {it.email}
          </label>
          <input
            id="invite-email"
            name="email"
            className={fields.input}
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="invite-first">
              {it.firstName}
            </label>
            <input id="invite-first" name="firstName" className={fields.input} autoComplete="given-name" />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="invite-last">
              {it.lastName}
            </label>
            <input id="invite-last" name="lastName" className={fields.input} autoComplete="family-name" />
          </div>
        </div>
        {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
        <div className={fields.actions}>
          <Button type="submit" icon="send" disabled={pending} aria-busy={pending}>
            {pending ? it.sendingInvite : it.sendInvite}
          </Button>
        </div>
      </form>
      {redeemUrl ? (
        <div className={styles.success} role="status">
          <p>{copied ? it.copied : it.inviteCreated}</p>
          <code className={styles.url}>{redeemUrl}</code>
          <Button type="button" variant="accent" icon="plus" onClick={copyLink}>
            {copied ? it.copiedShort : it.copyLink}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
