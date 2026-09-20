"use client";

import { useActionState } from "react";
import { withdrawRegistrationAction } from "@/features/registrations/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";

export function WithdrawForm({ registrationId }: { registrationId: string }) {
  const [state, action] = useActionState(withdrawRegistrationAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="registrationId" value={registrationId} />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <PendingSubmitButton idle={it.withdraw} pendingLabel={it.withdrawing} variant="danger" icon="alert" />
    </form>
  );
}
