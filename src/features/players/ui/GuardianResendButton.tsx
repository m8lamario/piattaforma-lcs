"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendGuardianAuthorizationAction } from "@/features/players/actions";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import styles from "./GuardianResendButton.module.css";

export type GuardianResendTarget = {
  kind: "enrollment" | "publication";
  remainingResends: number;
  resendAvailableAt: string | null;
  deliveryState: UserEmailDeliveryState;
};

type Props = {
  target: GuardianResendTarget;
};

export function GuardianResendButton({ target }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(resendGuardianAuthorizationAction, undefined);
  const handled = useRef<object | null>(null);
  const [now] = useState(() => Date.now());
  const until = target.resendAvailableAt ? new Date(target.resendAvailableAt).getTime() : 0;
  const waiting = until > now;
  const blocked =
    target.deliveryState === "undeliverable" ||
    target.remainingResends <= 0 ||
    target.deliveryState === "sending" ||
    waiting;

  useEffect(() => {
    if (!(state && "sent" in state && state.sent)) return;
    if (handled.current === state) return;
    handled.current = state;
    router.refresh();
  }, [state, router]);

  const error = state && "error" in state ? state : null;

  if (target.deliveryState === "undeliverable") return null;

  return (
    <div className={styles.wrap}>
      <form action={action}>
        <input type="hidden" name="kind" value={target.kind} />
        <Button
          type="submit"
          variant="quiet"
          icon="mail"
          className={styles.button}
          disabled={pending || blocked}
          aria-busy={pending}
          aria-label={`${it.emailResendAction}. ${it.emailResendRemainingCompact.replace("{count}", String(target.remainingResends))}`}
        >
          {pending ? it.emailResendingAction : it.emailResendAction}
        </Button>
      </form>
      <span className={styles.remaining}>
        {it.emailResendRemainingCompact.replace("{count}", String(target.remainingResends))}
      </span>
      {error?.error ? <ActionError error={error.error} code={error.code} /> : null}
    </div>
  );
}
