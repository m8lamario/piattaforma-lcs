"use client";

import { useActionState } from "react";
import { withdrawRegistrationAction } from "@/features/registrations/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import styles from "./WithdrawForm.module.css";

type Props = {
  registrationId: string;
  quiet?: boolean;
};

export function WithdrawForm({ registrationId, quiet = false }: Props) {
  const [state, action] = useActionState(withdrawRegistrationAction, undefined);
  return (
    <form action={action} className={quiet ? styles.quietForm : undefined}>
      <input type="hidden" name="registrationId" value={registrationId} />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <PendingSubmitButton
        idle={it.withdraw}
        pendingLabel={it.withdrawing}
        variant={quiet ? "ghost" : "danger"}
        icon={quiet ? undefined : "alert"}
        className={quiet ? styles.quiet : undefined}
      />
    </form>
  );
}
