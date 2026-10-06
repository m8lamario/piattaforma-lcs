import { ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  status: string;
  teamPayment?: boolean;
  nextHref?: string;
  nextLabel?: string;
};

export function PaymentStatusView({ status, teamPayment, nextHref, nextLabel }: Props) {
  if (status === "SUCCEEDED") {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.paymentCovered}
        </p>
        {nextHref ? <ButtonLink href={nextHref}>{nextLabel ?? it.ctaContinue}</ButtonLink> : null}
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerDanger}`} role="status">
          {it.paymentFailed}
        </p>
        <ButtonLink href={teamPayment ? "/squadra" : "/area/registrazione/pagamento"} variant="success" icon="payment">
          {it.paymentPay}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className={fields.form}>
      <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
        {it.paymentPendingConfirm}
      </p>
      <ButtonLink href={teamPayment ? "/squadra" : "/area"} variant="ghost">
        {it.backToArea}
      </ButtonLink>
    </div>
  );
}
