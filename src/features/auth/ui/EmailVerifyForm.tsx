"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeUnverifiedEmailAction,
  resendEmailVerificationAction,
  verifyEmailCodeAction,
} from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./EmailVerifyForm.module.css";

type Props = {
  currentEmail: string;
  nextPath: string;
  active: boolean;
  expiresLabel: string | null;
  resendAvailableAt: string | null;
  resendCooldownSeconds: number;
};

export function EmailCodeForm({
  currentEmail,
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
  const handledChange = useRef<object | null>(null);
  const [code, setCode] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [localUntil, setLocalUntil] = useState(0);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailCodeAction, undefined);
  const [resendState, resendAction, resendPending] = useActionState(resendEmailVerificationAction, undefined);
  const [changeState, changeAction, changePending] = useActionState(changeUnverifiedEmailAction, undefined);

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

  useEffect(() => {
    if (!(changeState && "changed" in changeState && changeState.changed)) return;
    if (handledChange.current === changeState) return;
    handledChange.current = changeState;
    setEditingEmail(false);
    setCode("");
    submitted.current = "";
    setLocalUntil(Date.now() + resendCooldownSeconds * 1000);
    router.refresh();
  }, [changeState, resendCooldownSeconds, router]);

  const verifyError = verifyState && "error" in verifyState ? verifyState : null;
  const resendError = resendState && "error" in resendState ? resendState : null;
  const changeError = changeState && "error" in changeState ? changeState : null;

  return (
    <>
      <form ref={formRef} className={fields.form} action={verifyAction}>
        <h1>{it.emailVerifyTitle}</h1>
        <p className={fields.help}>
          {it.emailVerifyHelp} <strong className={styles.address}>{currentEmail}</strong>. {it.emailVerifyInbox}
        </p>
        <p className={styles.meta}>{it.emailVerifyCheckHint}</p>
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
      {editingEmail ? (
        <form className={fields.form} action={changeAction}>
          {changeError?.error ? <ActionError error={changeError.error} code={changeError.code} /> : null}
          {changeState && "unchanged" in changeState ? (
            <p className={fields.help} role="status">
              {it.emailVerifyUnchanged}
            </p>
          ) : null}
          <label className={fields.field}>
            <span className={fields.label}>{it.emailVerifyChangeLabel}</span>
            <input
              id="email-correction"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={currentEmail}
              className={fields.input}
              aria-invalid={Boolean(changeError?.error)}
            />
          </label>
          <Button type="submit" disabled={changePending} aria-busy={changePending}>
            {changePending ? it.saving : it.emailVerifyChangeSubmit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={changePending}
            onClick={() => setEditingEmail(false)}
          >
            {it.emailVerifyCancelChange}
          </Button>
        </form>
      ) : (
        <div className={fields.form}>
          {changeState && "changed" in changeState ? (
            <p className={fields.help} role="status">
              {it.emailVerifyChanged}
            </p>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => setEditingEmail(true)}>
            {it.emailVerifyWrongAddress}
          </Button>
        </div>
      )}
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
