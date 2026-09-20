"use client";

import { useActionState } from "react";
import { saveMediaConsentAction } from "@/features/consents/actions";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
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
    <form className={fields.form} action={action} aria-busy={pending}>
      {required ? <p className={fields.notice}>{it.consentMediaRequired}</p> : <p className={fields.notice}>{it.consentMediaOptional}</p>}
      {currentDecision === "accepted" ? (
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.consentMediaCurrentAccept}
        </p>
      ) : null}
      {currentDecision === "refused" ? (
        <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
          {it.consentMediaCurrentRefuse}
        </p>
      ) : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      <article className={`${styles.block} ${styles.featured}`}>
        <div className={styles.headline}>
          <h2>{document.title}</h2>
          <p className={styles.version}>
            {it.consentVersion} {document.version}
          </p>
        </div>
        <p className={fields.notice}>{it.legalPlaceholderNotice}</p>
        <pre className={styles.body}>{document.body}</pre>
      </article>

      <input type="hidden" name="versionId" value={document.versionId} />
      <input type="hidden" name="intent" value="continue" />

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.mediaChoiceTitle}</legend>
        <div className={styles.choices}>
          <div className={`${styles.choice} ${styles.choiceAccept} ${currentDecision === "accepted" ? styles.choiceCurrent : ""}`}>
            <h3>{it.consentMediaAccept}</h3>
            <p>{it.mediaChoiceAcceptHelp}</p>
            <Button type="submit" name="decision" value="accept" disabled={pending} aria-busy={pending}>
              {pending ? it.saving : it.consentMediaAccept}
            </Button>
          </div>
          {required ? null : (
            <div className={`${styles.choice} ${styles.choiceRefuse} ${currentDecision === "refused" ? styles.choiceCurrent : ""}`}>
              <h3>{it.consentMediaRefuse}</h3>
              <p>{it.mediaChoiceRefuseHelp}</p>
              <Button type="submit" name="decision" value="refuse" variant="ghost" disabled={pending}>
                {it.consentMediaRefuse}
              </Button>
            </div>
          )}
        </div>
      </fieldset>

      <p>
        <ButtonLink href="/area" variant="ghost" icon="back">
          {it.backToArea}
        </ButtonLink>
      </p>
    </form>
  );
}
