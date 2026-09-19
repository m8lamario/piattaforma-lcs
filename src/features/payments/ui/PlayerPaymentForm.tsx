"use client";

import { useActionState } from "react";
import { startPlayerCheckoutAction } from "@/features/payments/actions";
import { Button } from "@/shared/ui/Button";
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
      <p>
        {it.paymentAmount}:{" "}
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
      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.redirecting : it.paymentPay}
        </Button>
      </div>
    </form>
  );
}
