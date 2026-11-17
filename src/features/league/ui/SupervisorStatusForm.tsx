"use client";

import { useActionState } from "react";
import {
  resendLeagueSupervisorActivationAction,
  setLeagueSupervisorStatusAction,
} from "@/features/league/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";

type Props = {
  id: string;
  status: "ACTIVE" | "SUSPENDED";
  canResend?: boolean;
};

export function SupervisorStatusForm({ id, status, canResend = false }: Props) {
  const [state, formAction, pending] = useActionState(setLeagueSupervisorStatusAction, undefined);
  const [resendState, resendAction, resending] = useActionState(resendLeagueSupervisorActivationAction, undefined);
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={nextStatus} />
        {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
        <Button type="submit" variant={status === "ACTIVE" ? "ghost" : "accent"} disabled={pending} aria-busy={pending}>
          {status === "ACTIVE" ? it.adminSupervisorSuspend : it.adminSupervisorReactivate}
        </Button>
      </form>
      {canResend ? (
        <form action={resendAction}>
          <input type="hidden" name="id" value={id} />
          {resendState?.error ? <ActionError error={resendState.error} code={resendState.code} /> : null}
          <Button type="submit" variant="ghost" disabled={resending} aria-busy={resending}>
            {it.adminSupervisorResend}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
