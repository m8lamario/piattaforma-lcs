"use client";

import { useActionState } from "react";
import { nudgeRegistrationAction } from "@/features/teams/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Icon } from "@/shared/ui/Icon";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import styles from "./TeamRoster.module.css";

type Props = {
  teamId: string;
  userId: string;
  copy: {
    nudge: string;
    nudging: string;
    sent: string;
  };
};

export function NudgeForm({ teamId, userId, copy }: Props) {
  const [state, action, pending] = useActionState(nudgeRegistrationAction, undefined);
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="userId" value={userId} />
      <PendingSubmitButton idle={copy.nudge} pendingLabel={copy.nudging} variant="secondary" icon="bell" disabled={pending} />
      {state && "ok" in state && state.ok ? (
        <span className={styles.sent} role="status">
          <Icon name="check" size={16} />
          {copy.sent}
        </span>
      ) : null}
      {state && "error" in state ? <ActionError error={state.error} code={state.code} /> : null}
    </form>
  );
}
