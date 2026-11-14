import { SUPPORT_EMAIL } from "@/shared/config/app";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./EmailDeliveryStatus.module.css";

const COPY: Record<UserEmailDeliveryState, string> = {
  not_sent: it.emailDeliveryNotSent,
  sending: it.emailDeliverySending,
  accepted: it.emailDeliveryAccepted,
  delivered: it.emailDeliveryDelivered,
  undeliverable: it.emailDeliveryUndeliverable,
  technical_error: it.emailDeliveryTechnicalError,
};

const BANNER: Record<UserEmailDeliveryState, string> = {
  not_sent: fields.bannerInfo,
  sending: fields.bannerInfo,
  accepted: fields.bannerWarn,
  delivered: fields.bannerOk,
  undeliverable: fields.bannerDanger,
  technical_error: fields.bannerDanger,
};

const CHIP: Record<UserEmailDeliveryState, StatusTone> = {
  not_sent: "todo",
  sending: "todo",
  accepted: "attention",
  delivered: "complete",
  undeliverable: "danger",
  technical_error: "danger",
};

type Props = {
  state: UserEmailDeliveryState;
  remainingResends: number;
  contactSupport?: boolean;
  hideRemaining?: boolean;
  compact?: boolean;
};

export function EmailDeliveryStatus({
  state,
  remainingResends,
  contactSupport = false,
  hideRemaining = false,
  compact = false,
}: Props) {
  const remaining = it.emailResendRemaining.replace("{count}", String(remainingResends));
  const remainingShort = it.emailResendRemainingCompact.replace("{count}", String(remainingResends));
  const support = it.emailContactSupport.replace("{email}", SUPPORT_EMAIL);

  if (compact) {
    return (
      <div className={styles.compact} role="status">
        <StatusChip tone={CHIP[state]}>{COPY[state]}</StatusChip>
        {contactSupport ? (
          <p className={fields.help}>{support}</p>
        ) : hideRemaining ? null : (
          <p className={fields.help}>{remainingShort}</p>
        )}
      </div>
    );
  }

  return (
    <div className={fields.bannerStack} role="status">
      <p className={`${fields.banner} ${BANNER[state]}`}>{COPY[state]}</p>
      {hideRemaining ? null : <p className={fields.help}>{remaining}</p>}
      {contactSupport ? <p className={`${fields.banner} ${fields.bannerWarn}`}>{support}</p> : null}
    </div>
  );
}
