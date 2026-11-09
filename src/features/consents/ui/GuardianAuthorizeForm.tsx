"use client";

import { useActionState, useCallback, useState } from "react";
import { submitGuardianAuthorizationAction } from "@/features/consents/guardianActions";
import { ConsentBoxList } from "@/features/consents/ui/ConsentBoxList";
import { LegalReader } from "@/features/consents/ui/LegalReader";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { Icon } from "@/shared/ui/Icon";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ConsentDocumentView } from "@/features/consents/ui/PrivacyConsentForm";
import consentStyles from "@/features/consents/ui/ConsentForm.module.css";
import pageStyles from "@/app/autorizzazione-genitore/[token]/page.module.css";

type CurrentChoice = { code: string; accepted: boolean; value?: string | null };

type Props = {
  token: string;
  purpose: "AUTHORIZE" | "PUBLICATION";
  playerName: string;
  tournamentName: string;
  documents: ConsentDocumentView[];
  boxes: ConsentBoxDef[];
  currentChoices?: CurrentChoice[];
  currentG3?: "OTHER_PARENT" | "SOLE" | "";
  submittedStatus?: "AUTHORIZED" | "REFUSED" | null;
};

export function GuardianAuthorizeForm({
  token,
  purpose,
  playerName,
  tournamentName,
  documents,
  boxes,
  currentChoices = [],
  currentG3 = "",
  submittedStatus = null,
}: Props) {
  const [mode, setMode] = useState<"form" | "summary">(
    currentChoices.length > 0 || submittedStatus ? "summary" : "form",
  );
  const [confirmingRefuse, setConfirmingRefuse] = useState(false);
  const [readSlugs, setReadSlugs] = useState<Record<string, boolean>>(() =>
    submittedStatus ? Object.fromEntries(documents.map((document) => [document.slug, true])) : {},
  );
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(currentChoices.map((choice) => [choice.code, choice.accepted])),
  );
  const [g3, setG3] = useState<"OTHER_PARENT" | "SOLE" | "">(currentG3);
  const markRead = useCallback((slug: string) => {
    setReadSlugs((current) => ({ ...current, [slug]: true }));
  }, []);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof submitGuardianAuthorizationAction>[0], formData: FormData) => {
      const result = await submitGuardianAuthorizationAction(prev, formData);
      if (result && "done" in result && result.done) {
        setMode("summary");
        setConfirmingRefuse(false);
        if ("refused" in result && result.refused) {
          setValues((current) => Object.fromEntries(Object.keys(current).map((code) => [code, false])));
        }
      }
      return result;
    },
    undefined,
  );

  const submitted = Boolean(state && "done" in state && state.done);
  const refused = (state && "refused" in state && state.refused) || submittedStatus === "REFUSED";
  const showSummary = mode === "summary";

  if (showSummary) {
    return (
      <div className={pageStyles.statusCard}>
        <h1 className={pageStyles.title}>{it.guardianLinkTitle}</h1>
        <p className={pageStyles.lead}>
          {submitted
            ? refused
              ? it.guardianLinkRefused
              : it.guardianLinkDone
            : it.guardianLinkSummary}
        </p>
        <p className={fields.help}>{it.guardianLinkAmendHelp}</p>
        <ul className={consentStyles.choiceList}>
          {boxes.map((box) => {
            const latest = values[box.code] ?? currentChoices.find((choice) => choice.code === box.code)?.accepted;
            return (
              <li key={box.code} className={consentStyles.check}>
                <span className={consentStyles.boxCode}>{box.code}</span>
                <span style={{ flex: 1 }}>{it[box.labelKey]}</span>
                <StatusChip tone={refused ? "danger" : latest ? "complete" : "neutral"}>
                  {refused || latest === false ? it.consentsInactive : latest ? it.consentsActive : it.consentsInactive}
                </StatusChip>
              </li>
            );
          })}
        </ul>
        <div className={fields.actions}>
          <Button type="button" onClick={() => setMode("form")}>
            {it.guardianLinkEdit}
          </Button>
        </div>
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

      {confirmingRefuse ? (
        <div
          className={`${fields.banner} ${fields.bannerDanger} ${pageStyles.confirmPanel}`}
          role="alertdialog"
          aria-labelledby="guardian-refuse-confirm-title"
        >
          <p id="guardian-refuse-confirm-title">
            <strong>{it.guardianLinkRefuseConfirmTitle}</strong>
          </p>
          <input type="hidden" name="refuse" value="on" />
          <input type="hidden" name="refuseConfirm" value="on" />
          <div className={fields.actions}>
            <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
              {pending ? it.saving : it.guardianLinkRefuseConfirm}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmingRefuse(false)}>
              {it.guardianLinkRefuseCancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className={`${fields.actions} ${fields.sticky}`}>
          <Button type="submit" disabled={pending || !requiredReady} aria-busy={pending}>
            {pending ? it.saving : it.guardianLinkSubmit}
          </Button>
          {purpose === "AUTHORIZE" ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmingRefuse(true)}>
              {it.guardianLinkRefuse}
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
