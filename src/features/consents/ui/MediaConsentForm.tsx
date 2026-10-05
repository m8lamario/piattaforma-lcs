"use client";

import { useActionState, useCallback, useState } from "react";
import { saveMediaConsentAction } from "@/features/consents/actions";
import { Button } from "@/shared/ui/Button";
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
  const [read, setRead] = useState(submitted);
  const [boxValues, setBoxValues] = useState<Record<string, boolean>>(currentUses);
  const markRead = useCallback(() => setRead(true), []);
  const canSubmit = read || submitted;
  const agreement = uses.filter((box) => box.code === "G14");
  const mediaUses = uses.filter((box) => box.code !== "G14");

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
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

      {canSubmit ? (
        <>
          <p className={fields.notice}>{it.consentMediaUsesHelp}</p>
          {agreement.length > 0 ? (
            <ConsentBoxList
              boxes={agreement}
              values={boxValues}
              disabled={pending}
              showHelp={false}
              showFootnote={false}
              onToggle={(code, accepted) => setBoxValues((current) => ({ ...current, [code]: accepted }))}
            />
          ) : null}
          <ConsentBoxList
            boxes={mediaUses}
            values={boxValues}
            disabled={pending}
            grouped
            showHelp={false}
            onToggle={(code, accepted) => setBoxValues((current) => ({ ...current, [code]: accepted }))}
          />
        </>
      ) : (
        <p className={fields.notice}>{it.consentReadLocked}</p>
      )}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" name="intent" value="continue" disabled={pending || !canSubmit} aria-busy={pending}>
          {pending ? it.saving : it.consentMediaSave}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending || !canSubmit}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
