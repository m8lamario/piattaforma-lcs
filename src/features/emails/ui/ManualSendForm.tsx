"use client";

import { useActionState } from "react";
import { previewManualEmailAction, sendManualEmailAction } from "@/features/emails/actions";
import { MANUAL_TEMPLATE_KEYS } from "@/features/emails/domain/catalog";
import { emailPurposeLabel } from "@/features/emails/ui/labels";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "@/features/admin/ui/admin.module.css";

type Recipient = {
  id: string;
  email: string;
  name: string | null;
  playerProfile: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    guardians: { email: string }[];
  } | null;
};

type Props = {
  recipients: Recipient[];
  selected?: Recipient | null;
  q: string;
  canCompose: boolean;
  copyGuardianAllowed: boolean;
  idempotencyKey: string;
};

export function ManualSendForm({
  recipients,
  selected,
  q,
  canCompose,
  copyGuardianAllowed,
  idempotencyKey,
}: Props) {
  const [preview, previewAction] = useActionState(previewManualEmailAction, undefined);
  const [sent, sendAction] = useActionState(sendManualEmailAction, undefined);

  return (
    <div className={styles.colMain}>
      <form method="get" className={fields.form}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="q">
            {it.adminEmailSearchUser}
          </label>
          <input id="q" name="q" className={fields.input} defaultValue={q} />
        </div>
        <Button type="submit" variant="secondary">
          {it.filterApply}
        </Button>
      </form>
      {recipients.length > 0 ? (
        <ul className={styles.list}>
          {recipients.map((row) => (
            <li key={row.id}>
              <a className={styles.item} href={`/admin/comunicazioni/nuova?q=${encodeURIComponent(q)}&userId=${row.id}`}>
                <span>
                  <strong>{row.email}</strong>
                  <span className={styles.meta}>
                    {row.playerProfile
                      ? `${row.playerProfile.firstName} ${row.playerProfile.lastName}`
                      : (row.name ?? "")}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : q.length >= 2 ? (
        <p className={styles.empty}>{it.adminEmailsEmpty}</p>
      ) : null}

      {selected ? (
        <form className={fields.form}>
          <input type="hidden" name="userId" value={selected.id} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="email" value={selected.email} />
          <input type="hidden" name="nome" value={selected.playerProfile?.firstName ?? ""} />
          <input type="hidden" name="cognome" value={selected.playerProfile?.lastName ?? ""} />
          <div className={fields.field}>
            <label className={fields.label} htmlFor="templateKey">
              {it.adminEmailSelectTemplate}
            </label>
            <select id="templateKey" name="templateKey" className={fields.input} defaultValue="MANUAL">
              {MANUAL_TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {emailPurposeLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="title">
              {it.adminEmailSubject}
            </label>
            <input id="title" name="title" className={fields.input} maxLength={200} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="body">
              {it.adminEmailBody}
            </label>
            <textarea id="body" name="body" className={fields.textarea} rows={6} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="link">
              link
            </label>
            <input id="link" name="link" className={fields.input} />
          </div>
          {canCompose ? (
            <>
              <p className={fields.readonly}>{it.adminEmailsComposeHint}</p>
              <div className={fields.field}>
                <label className={fields.label} htmlFor="customSubject">
                  {it.adminEmailCustomSubject}
                </label>
                <input id="customSubject" name="customSubject" className={fields.input} />
              </div>
              <div className={fields.field}>
                <label className={fields.label} htmlFor="customText">
                  {it.adminEmailCustomBody}
                </label>
                <textarea id="customText" name="customText" className={fields.textarea} rows={8} />
              </div>
            </>
          ) : null}
          <PendingSubmitButton
            idle={it.adminEmailPreview}
            pendingLabel={it.adminEmailsPreviewing}
            variant="secondary"
            formAction={previewAction}
          />
          {preview?.error ? <ActionError error={preview.error} code={preview.code} /> : null}
          {preview?.subject ? (
            <section>
              <h2 className={styles.sectionTitle}>{it.adminEmailHtmlPreview}</h2>
              <p>
                <strong>{preview.subject}</strong>
              </p>
              {preview.html ? (
                <iframe
                  className={styles.previewFrame}
                  title={it.adminEmailHtmlPreview}
                  sandbox=""
                  srcDoc={preview.html}
                />
              ) : null}
              <h3 className={styles.sectionTitle}>{it.adminEmailTextFallback}</h3>
              <pre className={styles.pre}>{preview.text}</pre>
            </section>
          ) : null}
          {copyGuardianAllowed ? (
            <label className={fields.radio}>
              <input type="checkbox" name="copyGuardian" />
              {it.adminEmailCopyGuardian}
            </label>
          ) : null}
          <label className={fields.radio}>
            <input type="checkbox" name="confirm" />
            {it.adminEmailConfirmSend}
          </label>
          {sent?.error ? <ActionError error={sent.error} code={sent.code} /> : null}
          {sent?.messageId ? (
            <p>
              {it.adminEmailSentOk}{" "}
              <a href={`/admin/comunicazioni/${sent.messageId}`}>{it.adminEmailsResult}</a>
            </p>
          ) : (
            <PendingSubmitButton idle={it.adminEmailSend} pendingLabel={it.adminEmailSending} formAction={sendAction} />
          )}
        </form>
      ) : null}
    </div>
  );
}
