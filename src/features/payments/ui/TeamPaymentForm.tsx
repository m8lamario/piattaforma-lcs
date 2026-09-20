"use client";

import { useActionState } from "react";
import { startTeamCheckoutAction } from "@/features/payments/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  teamId: string;
  covered: boolean;
  amount: number | null;
  currency: string;
};

export function TeamPaymentForm({ teamId, covered, amount, currency }: Props) {
  const [state, action, pending] = useActionState(async () => startTeamCheckoutAction(teamId), undefined);

  if (covered) {
    return (
      <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
        {it.paymentTeamCovered}
      </p>
    );
  }
  if (amount === null) {
    return null;
  }

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <h2 className={fields.heading}>{it.paymentTeamTitle}</h2>
      <p className={fields.help}>{it.paymentHelp}</p>
      <p className={fields.amount}>
        <span>{it.paymentAmount}</span>
        <strong>
          {amount} {currency}
        </strong>
      </p>
      <p className={fields.help}>{it.paymentPlaceholderFee}</p>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? it.redirecting : it.paymentPay}
      </Button>
    </form>
  );
}
