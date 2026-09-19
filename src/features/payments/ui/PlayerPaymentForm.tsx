"use client";

import { useActionState } from "react";
import { startPlayerCheckoutAction } from "@/features/payments/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import formStyles from "@/features/registrations/ui/WizardForm.module.css";

type Props = {
  covered: boolean;
  teamOnly: boolean;
  amount: number | null;
  currency: string;
};

export function PlayerPaymentForm({ covered, teamOnly, amount, currency }: Props) {
  const [state, action, pending] = useActionState(async () => startPlayerCheckoutAction(), undefined);

  if (covered) {
    return <p role="status">{it.paymentCovered}</p>;
  }
  if (teamOnly) {
    return <p>{it.paymentTeamOnly}</p>;
  }

  return (
    <form className={formStyles.form} action={action}>
      <p className={formStyles.help}>{it.paymentHelp}</p>
      <p>
        {it.paymentAmount}:{" "}
        <strong>
          {amount} {currency}
        </strong>
      </p>
      <p className={formStyles.help}>{it.paymentPlaceholderFee}</p>
      {state?.error ? (
        <p className={formStyles.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={formStyles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Reindirizzamento…" : it.paymentPay}
        </Button>
      </div>
    </form>
  );
}
