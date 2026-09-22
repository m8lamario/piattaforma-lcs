"use client";

import { useActionState, useState } from "react";
import { anonymizeAccountAction, deleteAccountAction } from "@/features/admin/actions";
import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD } from "@/features/admin/domain/lifecycle";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Props = {
  userId: string;
  email: string;
  lifecycleStatus: string;
  canDelete: boolean;
  canAnonymize: boolean;
};

export function AccountLifecycleForm({ userId, email, lifecycleStatus, canDelete, canAnonymize }: Props) {
  const blocked = lifecycleStatus === "ANONYMIZED";
  const deleted = lifecycleStatus === "DELETED";

  return (
    <section className={styles.dangerZone} aria-labelledby="lifecycle-title">
      <h2 id="lifecycle-title" className={styles.sectionTitle}>
        {it.lifecycleAdminTitle}
      </h2>
      <p className={fields.help}>{it.lifecycleAdminHelp}</p>
      {canDelete && !blocked && !deleted ? (
        <DestructiveForm
          userId={userId}
          email={email}
          word={DELETE_CONFIRM_WORD}
          action={deleteAccountAction}
          title={it.lifecycleDeleteTitle}
          help={it.lifecycleDeleteHelp}
          consequences={it.lifecycleDeleteConsequences}
          label={it.lifecycleDeleteConfirmLabel}
          submit={it.lifecycleDeleteSubmit}
          pendingLabel={it.lifecycleDeleting}
          blocked={false}
          variant="danger"
          icon="trash"
        />
      ) : null}
      {canAnonymize && !blocked ? (
        <DestructiveForm
          userId={userId}
          email={email}
          word={ANONYMIZE_CONFIRM_WORD}
          action={anonymizeAccountAction}
          title={it.lifecycleAnonymizeTitle}
          help={it.lifecycleAnonymizeHelp}
          consequences={it.lifecycleAnonymizeConsequences}
          label={it.lifecycleAnonymizeConfirmLabel}
          submit={it.lifecycleAnonymizeSubmit}
          pendingLabel={it.lifecycleAnonymizing}
          blocked={false}
          variant="warning"
          icon="alert"
        />
      ) : null}
      {blocked ? <p className={fields.bannerWarn}>{it.lifecycleAlreadyAnonymized}</p> : null}
      {deleted && !blocked ? <p className={fields.bannerWarn}>{it.lifecycleAlreadyDeleted}</p> : null}
      {!canDelete && !canAnonymize ? <p className={fields.help}>{it.lifecycleOrgCannotDelete}</p> : null}
    </section>
  );
}

type FormProps = {
  userId: string;
  email: string;
  word: string;
  action: typeof deleteAccountAction | typeof anonymizeAccountAction;
  title: string;
  help: string;
  consequences: string;
  label: string;
  submit: string;
  pendingLabel: string;
  blocked: boolean;
  variant: "danger" | "warning";
  icon: "trash" | "alert";
};

function DestructiveForm({
  userId,
  email,
  word,
  action,
  title,
  help,
  consequences,
  label,
  submit,
  pendingLabel,
  variant,
  icon,
}: FormProps) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);
  const matches = typed.trim().toLocaleUpperCase("it-IT") === word;

  return (
    <form action={formAction} className={styles.dangerCard} noValidate aria-busy={pending}>
      <input type="hidden" name="userId" value={userId} />
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p className={fields.bannerDanger}>{help}</p>
      <p className={fields.help}>{consequences}</p>
      <p className={fields.help}>
        {it.lifecycleTargetAccount}: {email}
      </p>
      {!armed ? (
        <Button type="button" variant={variant} icon={icon} onClick={() => setArmed(true)}>
          {it.lifecycleArm}
        </Button>
      ) : (
        <>
          <div className={fields.field}>
            <label className={fields.label} htmlFor={`confirm-${word}`}>
              {label.replace("{word}", word)}
            </label>
            <input
              id={`confirm-${word}`}
              name="confirm"
              className={fields.input}
              autoComplete="off"
              required
              disabled={pending}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
          {state && "error" in state && state.error ? (
            <ActionError error={state.error} code={"code" in state ? state.code : undefined} />
          ) : null}
          <div className={fields.actions}>
            <Button
              type="submit"
              variant={variant}
              icon={icon}
              disabled={pending || !matches}
              aria-busy={pending}
            >
              {pending ? pendingLabel : submit}
            </Button>
            <Button type="button" variant="ghost" icon="close" disabled={pending} onClick={() => setArmed(false)}>
              {it.lifecycleCancel}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
