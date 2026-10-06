"use client";

import { useActionState, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { savePrivacyConsentsAction } from "@/features/consents/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { ConsentBoxList } from "./ConsentBoxList";
import { LegalReader } from "./LegalReader";
import {
  readPrivacyDraft,
  reconcilePrivacyDraft,
  subscribePrivacyDraft,
  writePrivacyDraft,
} from "./privacyDraft";
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
  extraBoxes: ConsentBoxDef[];
  currentBoxes: Record<string, boolean>;
  registrationId: string;
};

export function PrivacyConsentForm({ documents, extraBoxes, currentBoxes, registrationId }: Props) {
  const [state, action, pending] = useActionState(savePrivacyConsentsAction, undefined);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const versionIds = useMemo(
    () => Object.fromEntries(documents.map((document) => [document.slug, document.versionId])),
    [documents],
  );
  const stored = useSyncExternalStore(
    subscribePrivacyDraft,
    () => readPrivacyDraft(registrationId),
    () => null,
  );
  const view = useMemo(
    () => reconcilePrivacyDraft(stored, versionIds, currentBoxes),
    [stored, versionIds, currentBoxes],
  );

  function commit(patch: Partial<typeof view>) {
    writePrivacyDraft(registrationId, {
      versionIds,
      readSlugs: patch.readSlugs ?? view.readSlugs,
      checkedSlugs: patch.checkedSlugs ?? view.checkedSlugs,
      boxValues: patch.boxValues ?? view.boxValues,
    });
  }

  const markRead = useCallback(
    (slug: string) => {
      const next = reconcilePrivacyDraft(readPrivacyDraft(registrationId), versionIds, currentBoxes);
      if (next.readSlugs[slug]) return;
      writePrivacyDraft(registrationId, {
        versionIds,
        ...next,
        readSlugs: { ...next.readSlugs, [slug]: true },
      });
    },
    [registrationId, versionIds, currentBoxes],
  );

  const requiredExtra = extraBoxes.filter((box) => box.kind === "required" || box.kind === "play");
  const firstUnchecked = documents.find((document) => !view.checkedSlugs[document.slug])?.slug ?? null;
  const visibleSlug =
    focusSlug && documents.some((document) => document.slug === focusSlug) ? focusSlug : firstUnchecked;
  const visibleDocument = documents.find((document) => document.slug === visibleSlug) ?? null;
  const allDocsReady = documents.every((document) => view.readSlugs[document.slug] && view.checkedSlugs[document.slug]);
  const allReady = allDocsReady && requiredExtra.every((box) => view.boxValues[box.code]);
  const missingDocs = documents.filter((document) => !view.checkedSlugs[document.slug]);
  const missingBoxes = requiredExtra.filter((box) => !view.boxValues[box.code]);

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      {documents.map((document) => (
        <input key={`version-${document.slug}`} type="hidden" name={`version:${document.slug}`} value={document.versionId} />
      ))}
      {documents
        .filter((document) => view.checkedSlugs[document.slug])
        .map((document) => (
          <input key={`accept-${document.slug}`} type="hidden" name={`accept:${document.slug}`} value="on" />
        ))}

      <ol className={styles.docNav} aria-label={it.stepPrivacy}>
        {documents.map((document, index) => {
          const done = Boolean(view.checkedSlugs[document.slug]);
          const current = document.slug === visibleSlug;
          return (
            <li key={document.slug}>
              <button
                type="button"
                className={`${styles.docNavButton} ${current ? styles.docNavCurrent : ""} ${done ? styles.docNavDone : ""}`}
                onClick={() => setFocusSlug(document.slug)}
                aria-current={current ? "step" : undefined}
              >
                <span className={styles.docNavMark} aria-hidden="true">
                  {done ? <Icon name="check" size={12} /> : index + 1}
                </span>
                {document.title}
              </button>
            </li>
          );
        })}
      </ol>

      {visibleDocument ? (
        <article className={styles.block}>
          <LegalReader
            document={visibleDocument}
            read={Boolean(view.readSlugs[visibleDocument.slug])}
            onRead={() => markRead(visibleDocument.slug)}
          />
          <label
            className={`${styles.check} ${view.readSlugs[visibleDocument.slug] ? "" : styles.checkLocked}`}
            htmlFor={`accept-visible-${visibleDocument.slug}`}
          >
            <input
              id={`accept-visible-${visibleDocument.slug}`}
              type="checkbox"
              disabled={!view.readSlugs[visibleDocument.slug]}
              checked={Boolean(view.checkedSlugs[visibleDocument.slug])}
              onChange={(event) => {
                const accepted = event.target.checked;
                commit({
                  checkedSlugs: { ...view.checkedSlugs, [visibleDocument.slug]: accepted },
                });
                if (accepted) setFocusSlug(null);
              }}
            />
            {view.readSlugs[visibleDocument.slug] ? (
              <>
                {it.consentAcceptLabel} {visibleDocument.version}
              </>
            ) : (
              it.consentReadLocked
            )}
          </label>
        </article>
      ) : null}

      {allDocsReady ? (
        <ConsentBoxList
          boxes={extraBoxes}
          values={view.boxValues}
          disabled={pending}
          grouped
          onToggle={(code, accepted) => commit({ boxValues: { ...view.boxValues, [code]: accepted } })}
        />
      ) : null}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" name="intent" value="continue" disabled={pending || !allReady} aria-busy={pending}>
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending || !allReady}>
          {it.saveExit}
        </Button>
        {!allReady ? (
          <ul className={styles.blockedList}>
            {missingDocs.map((document) => (
              <li key={document.slug}>{document.title}</li>
            ))}
            {missingBoxes.map((box) => (
              <li key={box.code}>{it[box.labelKey]}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
