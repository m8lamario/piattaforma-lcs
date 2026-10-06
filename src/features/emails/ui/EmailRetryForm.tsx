"use client";

import { useActionState } from "react";
import { retryEmailAction } from "@/features/emails/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";

export function EmailRetryForm({ id }: { id: string }) {
  const [state, action] = useActionState(retryEmailAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      <PendingSubmitButton idle={it.adminEmailRetry} pendingLabel={it.adminEmailSending} />
    </form>
  );
}
