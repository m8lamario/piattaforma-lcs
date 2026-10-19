"use client";

import { useActionState } from "react";
import { createMediaPartnerAccountAction } from "@/features/media-partners/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function PartnerAccountForm({ mediaPartnerId }: { mediaPartnerId: string }) {
  const [state, action, pending] = useActionState(createMediaPartnerAccountAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="mediaPartnerId" value={mediaPartnerId} />
      <p className={fields.help}>{it.mediaPartnerCreateAccountHelp}</p>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="mp-first-name">
          {it.firstName}
        </label>
        <input id="mp-first-name" name="firstName" className={fields.input} required maxLength={80} />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="mp-last-name">
          {it.lastName}
        </label>
        <input id="mp-last-name" name="lastName" className={fields.input} required maxLength={80} />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="mp-email">
          {it.email}
        </label>
        <input id="mp-email" name="email" type="email" className={fields.input} required autoComplete="email" />
      </div>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state?.done ? (
        <p className={fields.bannerOk} role="status">
          {it.mediaPartnerPendingActivation}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" icon="send" disabled={pending} aria-busy={pending}>
          {pending ? it.sendingInvite : it.mediaPartnerCreateAccount}
        </Button>
      </div>
    </form>
  );
}
