"use client";

import { useActionState } from "react";
import {
  resendMediaPartnerActivationAction,
  setMediaPartnerAccountStatusAction,
  setMediaPartnerStatusAction,
} from "@/features/media-partners/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";

type Props = {
  id: string;
  status: "ACTIVE" | "SUSPENDED";
  kind: "organization" | "account";
  canResend?: boolean;
};

export function PartnerStatusForm({ id, status, kind, canResend = false }: Props) {
  const action = kind === "organization" ? setMediaPartnerStatusAction : setMediaPartnerAccountStatusAction;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [resendState, resendAction, resending] = useActionState(resendMediaPartnerActivationAction, undefined);
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={nextStatus} />
        {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
        <Button type="submit" variant={status === "ACTIVE" ? "ghost" : "accent"} disabled={pending} aria-busy={pending}>
          {status === "ACTIVE" ? it.mediaPartnerSuspend : it.mediaPartnerReactivate}
        </Button>
      </form>
      {canResend ? (
        <form action={resendAction}>
          <input type="hidden" name="id" value={id} />
          {resendState?.error ? <ActionError error={resendState.error} code={resendState.code} /> : null}
          <Button type="submit" variant="ghost" disabled={resending} aria-busy={resending}>
            {it.mediaPartnerResend}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
