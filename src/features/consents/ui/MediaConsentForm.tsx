"use client";

import { useActionState, useCallback, useState } from "react";
import { saveMediaConsentAction } from "@/features/consents/actions";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { ConsentBoxList } from "./ConsentBoxList";
import { LegalReader } from "./LegalReader";
import styles from "./ConsentForm.module.css";
import type { ConsentDocumentView } from "./PrivacyConsentForm";

type Props = {
  document: ConsentDocumentView;
  uses: ConsentBoxDef[];
  currentUses: Record<string, boolean>;
  submitted: boolean;
};

export function MediaConsentForm({ document, uses, currentUses, submitted }: Props) {
  const [state, action, pending] = useActionState(saveMediaConsentAction, undefined);
  const [read, setRead] = useState(false);
  const [boxValues, setBoxValues] = useState<Record<string, boolean>>(currentUses);
  const markRead = useCallback(() => setRead(true), []);
  const canSubmit = read || submitted;

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <p className={fields.notice}>{it.consentMediaUsesHelp}</p>
      {submitted ? (
        <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
          {it.consentMediaSubmitted}
        </p>
      ) : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      <article className={`${styles.block} ${styles.featured}`}>
        <LegalReader document={document} read={read} onRead={markRead} />
      </article>

      <input type="hidden" name="versionId" value={document.versionId} />
      <input type="hidden" name="intent" value="continue" />

      {canSubmit ? (
        <ConsentBoxList
          boxes={uses}
          values={boxValues}
          disabled={pending}
          onToggle={(code, accepted) => setBoxValues((current) => ({ ...current, [code]: accepted }))}
        />
      ) : (
        <p className={fields.notice}>{it.consentReadLocked}</p>
      )}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" disabled={pending || !canSubmit} aria-busy={pending}>
          {pending ? it.saving : it.consentMediaSave}
        </Button>
        <ButtonLink href="/area" variant="ghost" icon="back">
          {it.backToArea}
        </ButtonLink>
      </div>
    </form>
  );
}
