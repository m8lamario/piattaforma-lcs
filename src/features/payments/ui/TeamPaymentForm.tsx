"use client";

import { useActionState } from "react";
import { startTeamCheckoutAction } from "@/features/payments/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import formStyles from "@/features/registrations/ui/WizardForm.module.css";

type Props = {
  teamId: string;
  covered: boolean;
  amount: number | null;
  currency: string;
};

export function TeamPaymentForm({ teamId, covered, amount, currency }: Props) {
  const [state, action, pending] = useActionState(async () => startTeamCheckoutAction(teamId), undefined);

  if (covered) {
    return <p role="status">{it.paymentTeamCovered}</p>;
  }
  if (amount === null) {
    return null;
  }

  return (
    <form className={formStyles.form} action={action}>
      <h2>{it.paymentTeamTitle}</h2>
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
      <Button type="submit" disabled={pending}>
        {pending ? "Reindirizzamento…" : it.paymentPay}
      </Button>
    </form>
  );
}
