"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendOwnSchoolAccessActivationAction } from "@/features/school-access/actions";
import { EmailDeliveryStatus } from "@/features/emails/ui/EmailDeliveryStatus";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  email: string;
  token?: string;
  deliveryState: UserEmailDeliveryState | null;
  remainingResends: number;
  contactSupport: boolean;
  resendAvailableAt: string | null;
  pendingApproval: boolean;
};

export function SchoolAccessResendPanel({
  email,
  token,
  deliveryState,
  remainingResends,
  contactSupport,
  resendAvailableAt,
  pendingApproval,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(resendOwnSchoolAccessActivationAction, undefined);
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
    pendingApproval ||
    deliveryState === "undeliverable" ||
    remainingResends <= 0 ||
    deliveryState === "sending" ||
    waiting;

  return (
    <div className={fields.form}>
      <h2 className={fields.legend}>{it.schoolAccessResendTitle}</h2>
      <p className={fields.help}>
        {pendingApproval ? it.schoolAccessResendPending : it.schoolAccessResendReady} <strong>{email}</strong>
      </p>
      {deliveryState ? (
        <EmailDeliveryStatus
          state={deliveryState}
          remainingResends={remainingResends}
          contactSupport={contactSupport}
          hideRemaining={pendingApproval}
        />
      ) : null}
      <p className={fields.help}>{it.emailTermsEmailHint}</p>
      {error?.error ? <ActionError error={error.error} code={error.code} /> : null}
      {pendingApproval ? null : (
        <form action={action}>
          {token ? <input type="hidden" name="token" value={token} /> : null}
          <Button type="submit" variant="secondary" disabled={pending || blocked} aria-busy={pending}>
            {pending ? it.emailResendingAction : it.emailResendAction}
          </Button>
        </form>
      )}
    </div>
  );
}
