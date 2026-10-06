"use client";

import { useActionState, useCallback, useState } from "react";
import { submitGuardianAuthorizationAction } from "@/features/consents/guardianActions";
import { ConsentBoxList } from "@/features/consents/ui/ConsentBoxList";
import { LegalReader } from "@/features/consents/ui/LegalReader";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ConsentDocumentView } from "@/features/consents/ui/PrivacyConsentForm";
import consentStyles from "@/features/consents/ui/ConsentForm.module.css";
import pageStyles from "@/app/autorizzazione-genitore/[token]/page.module.css";

type Props = {
  token: string;
  purpose: "AUTHORIZE" | "PUBLICATION";
  playerName: string;
  tournamentName: string;
  documents: ConsentDocumentView[];
  boxes: ConsentBoxDef[];
};

export function GuardianAuthorizeForm({ token, purpose, playerName, tournamentName, documents, boxes }: Props) {
  const [state, action, pending] = useActionState(submitGuardianAuthorizationAction, undefined);
  const [readSlugs, setReadSlugs] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [g3, setG3] = useState<"OTHER_PARENT" | "SOLE" | "">("");
  const markRead = useCallback((slug: string) => {
    setReadSlugs((current) => ({ ...current, [slug]: true }));
  }, []);

  if (state && "done" in state && state.done) {
    return (
      <div className={pageStyles.statusCard}>
        <h1 className={pageStyles.title}>{it.guardianLinkTitle}</h1>
        <p className={pageStyles.lead}>{"refused" in state && state.refused ? it.guardianLinkRefused : it.guardianLinkDone}</p>
      </div>
    );
  }

  const roleBoxes = boxes.filter((box) => box.code === "G1");
  const g3Box = boxes.find((box) => box.code === "G3");
  const otherBoxes = boxes.filter((box) => box.code !== "G1" && box.code !== "G3");
  const requiredReady = documents.every((document) => readSlugs[document.slug]);

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <header className={pageStyles.headerCard}>
        <p className={pageStyles.kicker}>{tournamentName}</p>
        <h1 className={pageStyles.title}>{it.guardianLinkTitle}</h1>
        <p className={pageStyles.lead}>{it.guardianLinkHelp}</p>

        <div className={pageStyles.metaGrid}>
          <div className={pageStyles.metaItem}>
            <span className={pageStyles.metaIcon} aria-hidden="true">
              <Icon name="user" size={18} />
            </span>
            <div className={pageStyles.metaContent}>
              <span className={pageStyles.metaLabel}>{it.guardianLinkPlayer}</span>
              <span className={pageStyles.metaValue}>{playerName}</span>
            </div>
          </div>

          <div className={pageStyles.metaItem}>
            <span className={pageStyles.metaIcon} aria-hidden="true">
              <Icon name="team" size={18} />
            </span>
            <div className={pageStyles.metaContent}>
              <span className={pageStyles.metaLabel}>{it.guardianLinkTournament}</span>
              <span className={pageStyles.metaValue}>{tournamentName}</span>
            </div>
          </div>
        </div>
      </header>

      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}

      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      {documents.map((document) => (
        <input key={document.slug} type="hidden" name={`version:${document.slug}`} value={document.versionId} />
      ))}

      <div className={pageStyles.docList}>
        <h2 className={pageStyles.sectionTitle}>{it.legalIndexTitle}</h2>
        {documents.map((document) => (
          <article key={document.slug} className={consentStyles.block}>
            <LegalReader
              document={document}
              read={Boolean(readSlugs[document.slug])}
              onRead={() => markRead(document.slug)}
            />
          </article>
        ))}
      </div>

      {requiredReady ? (
        <>
          {roleBoxes.length > 0 ? (
            <>
              <p className={fields.notice}>{it.guardianLinkRole}</p>
              <ConsentBoxList
                boxes={roleBoxes}
                values={values}
                disabled={pending}
                showHelp={false}
                showFootnote={false}
                onToggle={(code, accepted) => setValues((current) => ({ ...current, [code]: accepted }))}
              />
            </>
          ) : null}

          {g3Box ? (
            <fieldset className={fields.group}>
              <legend className={fields.legend}>{it.g3Legend}</legend>
              <label className={fields.radio} htmlFor="g3-other">
                <input
                  id="g3-other"
                  type="radio"
                  name="g3"
                  value="OTHER_PARENT"
                  checked={g3 === "OTHER_PARENT"}
                  onChange={() => setG3("OTHER_PARENT")}
                />
                {it.g3Other}
              </label>
              <label className={fields.radio} htmlFor="g3-sole">
                <input
                  id="g3-sole"
                  type="radio"
                  name="g3"
                  value="SOLE"
                  checked={g3 === "SOLE"}
                  onChange={() => setG3("SOLE")}
                />
                {it.g3Sole}
              </label>
            </fieldset>
          ) : null}

          <ConsentBoxList
            boxes={otherBoxes}
            values={values}
            disabled={pending}
            grouped
            showHelp={false}
            onToggle={(code, accepted) => setValues((current) => ({ ...current, [code]: accepted }))}
          />
        </>
      ) : (
        <p className={fields.notice}>{it.consentReadLocked}</p>
      )}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" disabled={pending || !requiredReady} aria-busy={pending}>
          {pending ? it.saving : it.guardianLinkSubmit}
        </Button>
        {purpose === "AUTHORIZE" ? (
          <Button type="submit" name="refuse" value="on" variant="ghost" disabled={pending}>
            {it.guardianLinkRefuse}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
