import { ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  status: string;
  teamPayment?: boolean;
};

export function PaymentStatusView({ status, teamPayment }: Props) {
  if (status === "SUCCEEDED") {
    return (
      <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
        {it.paymentCovered}
      </p>
    );
  }
  if (status === "FAILED") {
    return (
      <div className={fields.form}>
        <p className={`${fields.banner} ${fields.bannerDanger}`} role="status">
          {it.paymentFailed}
        </p>
        <ButtonLink href={teamPayment ? "/squadra" : "/area/registrazione/pagamento"}>{it.paymentPay}</ButtonLink>
      </div>
    );
  }
  return (
    <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
      {it.paymentPendingConfirm}
    </p>
  );
}
