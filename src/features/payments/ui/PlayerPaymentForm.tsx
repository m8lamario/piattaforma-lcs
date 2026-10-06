"use client";

import { useActionState } from "react";
import { startPlayerCheckoutAction } from "@/features/payments/actions";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  covered: boolean;
  teamOnly: boolean;
  amount: number | null;
  currency: string;
};

export function PlayerPaymentForm({ covered, teamOnly, amount, currency }: Props) {
  const [state, action, pending] = useActionState(async () => startPlayerCheckoutAction(), undefined);

  if (covered) {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.paymentCovered}
        </p>
        <div className={`${fields.actions} ${fields.sticky}`}>
          <ButtonLink href="/area/registrazione">{it.ctaContinue}</ButtonLink>
        </div>
      </div>
    );
  }
  if (teamOnly) {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerInfo}`}>{it.paymentTeamOnly}</p>
        <div className={`${fields.actions} ${fields.sticky}`}>
          <ButtonLink href="/area/registrazione">{it.ctaContinue}</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <p className={fields.amount}>
        <span>{it.paymentAmount}</span>
        <strong>
          {amount} {currency}
        </strong>
      </p>
      <p className={fields.help}>{it.paymentHelp}</p>
      <p className={fields.help}>{it.paymentPlaceholderFee}</p>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" variant="success" icon="payment" disabled={pending} aria-busy={pending}>
          {pending ? it.redirecting : it.paymentPay}
        </Button>
      </div>
    </form>
  );
}
