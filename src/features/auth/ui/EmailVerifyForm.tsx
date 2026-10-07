"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendEmailVerificationAction, verifyEmailCodeAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./EmailVerifyForm.module.css";

type Props = {
  sentTo: string;
  nextPath: string;
  active: boolean;
  expiresLabel: string | null;
  resendAvailableAt: string | null;
  resendCooldownSeconds: number;
};

export function EmailCodeForm({
  sentTo,
  nextPath,
  active,
  expiresLabel,
  resendAvailableAt,
  resendCooldownSeconds,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef("");
  const handledResend = useRef<object | null>(null);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [localUntil, setLocalUntil] = useState(0);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailCodeAction, undefined);
  const [resendState, resendAction, resendPending] = useActionState(resendEmailVerificationAction, undefined);

  const serverUntil = resendAvailableAt ? new Date(resendAvailableAt).getTime() : 0;
  const cooldownUntil = Math.max(serverUntil, localUntil);
  const remainingSeconds = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  useEffect(() => {
    if (code.length !== 6 || verifyPending) return;
    if (submitted.current === code) return;
    submitted.current = code;
    formRef.current?.requestSubmit();
  }, [code, verifyPending]);

  useEffect(() => {
    if (!(resendState && "sent" in resendState && resendState.sent)) return;
    if (handledResend.current === resendState) return;
    handledResend.current = resendState;
    setLocalUntil(Date.now() + resendCooldownSeconds * 1000);
    router.refresh();
  }, [resendState, resendCooldownSeconds, router]);

  const verifyError = verifyState && "error" in verifyState ? verifyState : null;
  const resendError = resendState && "error" in resendState ? resendState : null;

  return (
    <>
      <form ref={formRef} className={fields.form} action={verifyAction}>
        <h1>{it.emailVerifyTitle}</h1>
        <p className={fields.help}>
          {it.emailVerifyHelp} <strong className={styles.address}>{sentTo}</strong>. {it.emailVerifyInbox}
        </p>
        {expiresLabel ? <p className={styles.meta}>{expiresLabel}</p> : null}
        {!active ? <p className={styles.meta}>{it.emailVerifyMissing}</p> : null}
        {verifyError?.error ? <ActionError error={verifyError.error} code={verifyError.code} /> : null}
        <input type="hidden" name="next" value={nextPath} />
        <label className={fields.field}>
          <span className={fields.label}>{it.emailVerifyCodeLabel}</span>
          <input
            id="email-code"
            name="code"
            className={styles.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            enterKeyHint="done"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            aria-invalid={Boolean(verifyError?.error)}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            }}
          />
        </label>
        <Button type="submit" disabled={verifyPending || code.length !== 6} aria-busy={verifyPending}>
          {verifyPending ? it.saving : it.emailVerifySubmit}
        </Button>
      </form>
      <form className={fields.form} action={resendAction}>
        {resendError?.error ? <ActionError error={resendError.error} code={resendError.code} /> : null}
        {resendState && "sent" in resendState ? (
          <p className={fields.help} role="status">
            {it.emailVerifyResent}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          disabled={resendPending || remainingSeconds > 0}
          aria-busy={resendPending}
        >
          {resendPending
            ? it.saving
            : remainingSeconds > 0
              ? it.emailVerifyResendWait.replace("{seconds}", String(remainingSeconds))
              : active
                ? it.emailVerifyResend
                : it.emailVerifySend}
        </Button>
      </form>
    </>
  );
}
