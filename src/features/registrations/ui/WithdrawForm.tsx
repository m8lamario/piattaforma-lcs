"use client";

import { useActionState, useState } from "react";
import { withdrawRegistrationAction } from "@/features/registrations/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  registrationId: string;
};

export function WithdrawForm({ registrationId }: Props) {
  const [state, action] = useActionState(withdrawRegistrationAction, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className={fields.actions}>
        <Button type="button" variant="dangerQuiet" icon="alert" onClick={() => setConfirming(true)}>
          {it.withdraw}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className={fields.form}>
      <input type="hidden" name="registrationId" value={registrationId} />
      <div className={`${fields.banner} ${fields.bannerDanger}`} role="alert">
        <p>
          <strong>{it.withdrawConfirmTitle}</strong>
        </p>
        <p>{it.withdrawConfirmLead}</p>
      </div>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <PendingSubmitButton idle={it.withdraw} pendingLabel={it.withdrawing} variant="danger" icon="alert" />
        <Button type="button" variant="ghost" icon="close" onClick={() => setConfirming(false)}>
          {it.withdrawConfirmCancel}
        </Button>
      </div>
    </form>
  );
}
