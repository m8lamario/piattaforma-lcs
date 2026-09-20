import { ERROR_CATALOG, type ErrorCode } from "@/shared/errors";
import { recoveryHint, retryHint, userMessage } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import styles from "./ActionError.module.css";

type Props = {
  error?: string;
  code?: ErrorCode;
};

export function ActionError({ error, code }: Props) {
  if (!error && !code) return null;
  const definition = code ? ERROR_CATALOG[code] : null;
  const message = error || (code ? userMessage(code) : "");
  const hint = definition ? recoveryHint(definition.recovery) : null;
  const retry = definition ? retryHint(definition.retrySafe) : null;

  return (
    <div className={styles.alert} role="alert">
      <p className={styles.message}>{message}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {retry ? <p className={styles.retry}>{retry}</p> : null}
      {code ? (
        <p className={styles.ref}>
          {it.errorRefLabel}: <code>{code}</code>
        </p>
      ) : null}
    </div>
  );
}
