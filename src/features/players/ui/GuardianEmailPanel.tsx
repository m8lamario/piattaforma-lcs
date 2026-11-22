"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendGuardianAuthorizationAction } from "@/features/players/actions";
import { EmailDeliveryStatus } from "@/features/emails/ui/EmailDeliveryStatus";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  email: string;
  deliveryState: UserEmailDeliveryState;
  remainingResends: number;
  contactSupport: boolean;
  resendAvailableAt: string | null;
  kind?: "enrollment" | "publication";
};

export function GuardianEmailPanel({
  email,
  deliveryState,
  remainingResends,
  contactSupport,
  resendAvailableAt,
  kind = "enrollment",
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(resendGuardianAuthorizationAction, undefined);
  const handled = useRef<object | null>(null);

  useEffect(() => {
    if (!(state && "sent" in state && state.sent)) return;
    if (handled.current === state) return;
    handled.current = state;
    router.refresh();
  }, [state, router]);

  const error = state && "error" in state ? state : null;
  const [now] = useState(() => Date.now());
  const until = resendAvailableAt ? new Date(resendAvailableAt).getTime() : 0;
  const waiting = until > now;
  const blocked =
    deliveryState === "undeliverable" || remainingResends <= 0 || deliveryState === "sending" || waiting;

  return (
    <div className={fields.form}>
      <h2 className={fields.legend}>{kind === "publication" ? it.guardianResendSecondaryTitle : it.guardianResendTitle}</h2>
      <p className={fields.help}>
        {kind === "publication" ? it.guardianResendSecondaryHelp : it.guardianResendHelp} <strong>{email}</strong>
      </p>
      <EmailDeliveryStatus
        state={deliveryState}
        remainingResends={remainingResends}
        contactSupport={contactSupport}
      />
      <p className={fields.help}>{it.emailTermsEmailHint}</p>
      {error?.error ? <ActionError error={error.error} code={error.code} /> : null}
      <form action={action}>
        <input type="hidden" name="kind" value={kind} />
        <Button type="submit" variant="secondary" disabled={pending || blocked} aria-busy={pending}>
          {pending ? it.emailResendingAction : it.emailResendAction}
        </Button>
      </form>
    </div>
  );
}
