"use client";

import { useActionState } from "react";
import { saveEmailTemplateAction } from "@/features/emails/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "@/features/admin/ui/admin.module.css";

type Props = {
  templateKey: string;
  subject: string;
  textBody: string;
  canEdit: boolean;
};

export function TemplateEditForm({ templateKey, subject, textBody, canEdit }: Props) {
  const [state, action, pending] = useActionState(saveEmailTemplateAction, undefined);
  if (!canEdit) {
    return (
      <article>
        <h2 className={styles.sectionTitle}>{templateKey}</h2>
        <p>
          <strong>{subject}</strong>
        </p>
        <pre className={styles.pre}>{textBody}</pre>
      </article>
    );
  }
  return (
    <form action={action} className={fields.form}>
      <input type="hidden" name="key" value={templateKey} />
      <h2 className={styles.sectionTitle}>{templateKey}</h2>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={`subject-${templateKey}`}>
          {it.adminEmailSubject}
        </label>
        <input
          id={`subject-${templateKey}`}
          name="subject"
          className={fields.input}
          defaultValue={subject}
          required
        />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={`body-${templateKey}`}>
          {it.adminEmailBody}
        </label>
        <textarea
          id={`body-${templateKey}`}
          name="textBody"
          className={fields.textarea}
          rows={8}
          defaultValue={textBody}
          required
        />
      </div>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state && "ok" in state && state.ok ? <p role="status">{it.adminEmailsTemplateSaved}</p> : null}
      <Button type="submit" disabled={pending}>
        {it.adminEmailTemplateSave}
      </Button>
    </form>
  );
}
