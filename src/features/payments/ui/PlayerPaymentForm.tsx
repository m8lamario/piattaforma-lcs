"use client";

import { useActionState } from "react";
import { startPlayerCheckoutAction } from "@/features/payments/actions";
import { Button } from "@/shared/ui/Button";
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
      <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
        {it.paymentCovered}
      </p>
    );
  }
  if (teamOnly) {
    return <p className={`${fields.banner} ${fields.bannerInfo}`}>{it.paymentTeamOnly}</p>;
  }

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <p className={fields.help}>{it.paymentHelp}</p>
      <p className={fields.amount}>
        <span>{it.paymentAmount}</span>
        <strong>
          {amount} {currency}
        </strong>
      </p>
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
