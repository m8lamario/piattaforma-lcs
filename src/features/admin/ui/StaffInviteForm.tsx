"use client";

import { useActionState, useState } from "react";
import { createStaffInviteAction } from "@/features/admin/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import inviteStyles from "@/features/teams/ui/InviteForm.module.css";

export function StaffInviteForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createStaffInviteAction, undefined);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  if (state?.redeemUrl && state.redeemUrl !== savedUrl) {
    setSavedUrl(state.redeemUrl);
  }
  const redeemUrl = state?.redeemUrl ?? savedUrl;

  async function copyLink() {
    if (!redeemUrl) return;
    await navigator.clipboard.writeText(redeemUrl);
  }

  return (
    <section>
      <h2>{it.adminStaffInvite}</h2>
      <p>{it.adminStaffInviteHelp}</p>
      <form action={action} className={fields.form} noValidate aria-busy={pending}>
        <input type="hidden" name="teamId" value={teamId} />
        <div className={fields.field}>
          <label className={fields.label} htmlFor="staff-email">
            {it.email}
          </label>
          <input id="staff-email" name="email" type="email" required className={fields.input} autoComplete="email" />
        </div>
        {state?.error ? (
          <p className={fields.summary} role="alert">
            {state.error}
          </p>
        ) : null}
        <div className={fields.actions}>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? it.sendingInvite : it.sendInvite}
          </Button>
        </div>
      </form>
      {redeemUrl ? (
        <div className={inviteStyles.success} role="status">
          <p>{it.staffInviteCreated}</p>
          <code className={inviteStyles.url}>{redeemUrl}</code>
          <Button type="button" variant="accent" onClick={copyLink}>
            {it.copyLink}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
