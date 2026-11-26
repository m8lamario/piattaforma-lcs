"use client";

import { useActionState } from "react";
import { revokeConsentBoxAction } from "@/features/consents/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";

type Props = {
  code: string;
};

export function RevokeConsentForm({ code }: Props) {
  const [state, action, pending] = useActionState(revokeConsentBoxAction, undefined);
  return (
    <form action={action}>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="code" value={code} />
      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? it.saving : it.consentsRevoke}
      </Button>
    </form>
  );
}
