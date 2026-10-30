"use client";

import { useActionState, useState } from "react";
import { anonymizeSchoolAction, deleteSchoolAction } from "@/features/admin/actions";
import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD } from "@/features/admin/domain/lifecycle";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Props = {
  schoolId: string;
  schoolName: string;
  summary: string;
  sharedNote: string | null;
  anonymized: boolean;
  deleteBlocked: boolean;
  canDelete: boolean;
  canAnonymize: boolean;
};

export function SchoolLifecycleForm(props: Props) {
  return (
    <section className={styles.dangerZone} aria-labelledby="school-lifecycle-title">
      <h2 id="school-lifecycle-title" className={styles.sectionTitle}>
        {it.schoolLifecycleTitle}
      </h2>
      <p className={fields.help}>{it.schoolLifecycleHelp}</p>
      <p className={fields.help}>{props.summary}</p>
      {props.sharedNote ? <p className={fields.help}>{props.sharedNote}</p> : null}
      <p className={fields.help}>{it.schoolLifecycleRetain}</p>
      {props.canAnonymize && !props.anonymized ? (
        <ConfirmForm
          schoolId={props.schoolId}
          schoolName={props.schoolName}
          word={ANONYMIZE_CONFIRM_WORD}
          action={anonymizeSchoolAction}
          title={it.schoolLifecycleAnonymizeTitle}
          help={it.schoolLifecycleAnonymizeHelp}
          submit={it.schoolLifecycleAnonymizeSubmit}
          pendingLabel={it.schoolLifecycleAnonymizing}
          variant="warning"
          icon="alert"
        />
      ) : null}
      {props.anonymized ? <p className={fields.bannerWarn}>{it.errorSCHOOL_ALREADY_ANONYMIZED}</p> : null}
      {props.canDelete && props.deleteBlocked ? <p className={fields.bannerDanger}>{it.schoolLifecycleBlocked}</p> : null}
      {props.canDelete && !props.deleteBlocked ? (
        <ConfirmForm
          schoolId={props.schoolId}
          schoolName={props.schoolName}
          word={DELETE_CONFIRM_WORD}
          action={deleteSchoolAction}
          title={it.schoolLifecycleDeleteTitle}
          help={it.schoolLifecycleDeleteHelp}
          submit={it.schoolLifecycleDeleteSubmit}
          pendingLabel={it.schoolLifecycleDeleting}
          variant="danger"
          icon="trash"
        />
      ) : null}
      {!props.canDelete && !props.canAnonymize ? <p className={fields.help}>{it.lifecycleOrgCannotDelete}</p> : null}
    </section>
  );
}

function ConfirmForm({
  schoolId,
  schoolName,
  word,
  action,
  title,
  help,
  submit,
  pendingLabel,
  variant,
  icon,
}: {
  schoolId: string;
  schoolName: string;
  word: string;
  action: typeof deleteSchoolAction | typeof anonymizeSchoolAction;
  title: string;
  help: string;
  submit: string;
  pendingLabel: string;
  variant: "danger" | "warning";
  icon: "trash" | "alert";
}) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);
  const matches = typed.trim().toLocaleUpperCase("it-IT") === word;

  return (
    <form action={formAction} className={styles.dangerCard} noValidate aria-busy={pending}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p className={fields.bannerDanger}>{help}</p>
      <p className={fields.help}>
        {it.adminTeam}: {schoolName}
      </p>
      {!armed ? (
        <Button type="button" variant={variant} icon={icon} onClick={() => setArmed(true)}>
          {it.lifecycleArm}
        </Button>
      ) : (
        <>
          <div className={fields.field}>
            <label className={fields.label} htmlFor={`school-confirm-${word}`}>
              {it.schoolLifecycleConfirmLabel.replace("{word}", word)}
            </label>
            <input
              id={`school-confirm-${word}`}
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
            <Button type="submit" variant={variant} icon={icon} disabled={pending || !matches} aria-busy={pending}>
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
