"use client";

import { useActionState } from "react";
import { savePrivacyConsentsAction } from "@/features/consents/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import formStyles from "@/features/registrations/ui/WizardForm.module.css";
import styles from "./ConsentForm.module.css";

export type ConsentDocumentView = {
  slug: string;
  title: string;
  version: string;
  versionId: string;
  body: string;
};

type Props = {
  documents: ConsentDocumentView[];
};

export function PrivacyConsentForm({ documents }: Props) {
  const [state, action, pending] = useActionState(savePrivacyConsentsAction, undefined);

  return (
    <form className={formStyles.form} action={action}>
      <p className={formStyles.help}>{it.consentPrivacyHelp}</p>
      {state?.error ? (
        <p className={formStyles.summary} role="alert">
          {state.error}
        </p>
      ) : null}

      {documents.map((document) => (
        <article key={document.slug} className={styles.block}>
          <h2>{document.title}</h2>
          <p className={styles.version}>
            {it.consentVersion}: {document.version}
          </p>
          <p className={styles.notice}>{it.legalPlaceholderNotice}</p>
          <pre className={styles.body}>{document.body}</pre>
          <input type="hidden" name={`version:${document.slug}`} value={document.versionId} />
          <label className={styles.check}>
            <input type="checkbox" name={`accept:${document.slug}`} />
            {it.consentAcceptLabel} {document.version}
          </label>
        </article>
      ))}

      <div className={formStyles.actions}>
        <Button type="submit" name="intent" value="continue" disabled={pending}>
          {pending ? "Salvataggio…" : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
