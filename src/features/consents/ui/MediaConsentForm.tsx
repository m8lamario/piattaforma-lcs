"use client";

import { useActionState } from "react";
import { saveMediaConsentAction } from "@/features/consents/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import formStyles from "@/features/registrations/ui/WizardForm.module.css";
import styles from "./ConsentForm.module.css";
import type { ConsentDocumentView } from "./PrivacyConsentForm";

type Props = {
  document: ConsentDocumentView;
  required: boolean;
  currentDecision: "none" | "accepted" | "refused";
};

export function MediaConsentForm({ document, required, currentDecision }: Props) {
  const [state, action, pending] = useActionState(saveMediaConsentAction, undefined);

  return (
    <form className={formStyles.form} action={action}>
      <p className={formStyles.help}>{it.consentMediaHelp}</p>
      {required ? <p className={formStyles.help}>{it.consentMediaRequired}</p> : (
        <p className={formStyles.help}>{it.consentMediaOptional}</p>
      )}
      {currentDecision === "accepted" ? <p role="status">{it.consentMediaCurrentAccept}</p> : null}
      {currentDecision === "refused" ? <p role="status">{it.consentMediaCurrentRefuse}</p> : null}
      {state?.error ? (
        <p className={formStyles.summary} role="alert">
          {state.error}
        </p>
      ) : null}

      <article className={styles.block}>
        <h2>{document.title}</h2>
        <p className={styles.version}>
          {it.consentVersion}: {document.version}
        </p>
        <p className={styles.notice}>{it.legalPlaceholderNotice}</p>
        <pre className={styles.body}>{document.body}</pre>
      </article>

      <input type="hidden" name="versionId" value={document.versionId} />
      <input type="hidden" name="intent" value="continue" />

      <div className={formStyles.actions}>
        <Button type="submit" name="decision" value="accept" disabled={pending}>
          {pending ? "Salvataggio…" : it.consentMediaAccept}
        </Button>
        {required ? null : (
          <Button type="submit" name="decision" value="refuse" variant="ghost" disabled={pending}>
            {it.consentMediaRefuse}
          </Button>
        )}
      </div>
    </form>
  );
}
