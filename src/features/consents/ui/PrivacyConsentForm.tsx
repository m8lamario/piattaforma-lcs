"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { savePrivacyConsentsAction } from "@/features/consents/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import { LegalReader } from "./LegalReader";
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
  const [readSlugs, setReadSlugs] = useState<Record<string, boolean>>({});
  const [checkedSlugs, setCheckedSlugs] = useState<Record<string, boolean>>({});

  const markRead = useCallback((slug: string) => {
    setReadSlugs((current) => (current[slug] ? current : { ...current, [slug]: true }));
  }, []);

  const allReady = useMemo(
    () => documents.every((document) => readSlugs[document.slug] && checkedSlugs[document.slug]),
    [documents, readSlugs, checkedSlugs],
  );

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      {documents.map((document) => {
        const read = Boolean(readSlugs[document.slug]);
        return (
          <article key={document.slug} className={styles.block}>
            <LegalReader document={document} read={read} onRead={() => markRead(document.slug)} />
            <input type="hidden" name={`version:${document.slug}`} value={document.versionId} />
            <label
              className={`${styles.check} ${read ? "" : styles.checkLocked}`}
              htmlFor={`accept-${document.slug}`}
            >
              <input
                id={`accept-${document.slug}`}
                type="checkbox"
                name={`accept:${document.slug}`}
                disabled={!read}
                checked={Boolean(checkedSlugs[document.slug])}
                onChange={(event) =>
                  setCheckedSlugs((current) => ({
                    ...current,
                    [document.slug]: event.target.checked,
                  }))
                }
              />
              {read ? (
                <>
                  {it.consentAcceptLabel} {document.version}
                </>
              ) : (
                it.consentReadLocked
              )}
            </label>
          </article>
        );
      })}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button
          type="submit"
          name="intent"
          value="continue"
          disabled={pending || !allReady}
          aria-busy={pending}
        >
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending || !allReady}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
