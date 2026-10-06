import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { CONSENT_BOXES, type ConsentBoxCode } from "@/features/consents/domain/boxes";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { ChecklistLinks } from "./ChecklistLinks";
import styles from "./WizardForm.module.css";

type Props = {
  checklist: ChecklistItem[];
  isMinor?: boolean;
  guardianStatus?: "none" | "pending" | "authorized" | "refused";
  choices?: Array<{ code: string; accepted: boolean }>;
};

export function SummaryStep({ checklist, isMinor, guardianStatus, choices = [] }: Props) {
  const byCode = new Map(choices.map((row) => [row.code, row.accepted]));
  const playerCodes: ConsentBoxCode[] = isMinor ? ["G14"] : CONSENT_BOXES.filter((box) => box.path !== "minor").map((box) => box.code);
  const guardianCodes = CONSENT_BOXES.filter((box) => box.path !== "adult" && box.code !== "G14").map((box) => box.code);

  return (
    <div className={styles.placeholder}>
      <p>{it.summaryIntro}</p>
      <p>{it.summaryWhatNow}</p>
      <ChecklistLinks checklist={checklist} />
      {isMinor ? (
        <>
          <h2>{it.summaryActsGuardian}</h2>
          <p>
            {guardianStatus === "authorized"
              ? it.guardianBoxAuthorized
              : guardianStatus === "refused"
                ? it.guardianBoxRefused
                : it.summaryGuardianPending}
          </p>
          <ul>
            {guardianCodes.map((code) => (
              <li key={code}>
                {code}: {byCode.has(code) ? (byCode.get(code) ? it.guardianBoxAuthorized : it.guardianBoxRefused) : it.guardianBoxWaiting}
              </li>
            ))}
          </ul>
          <h2>{it.summaryActsPlayer}</h2>
          <ul>
            {playerCodes.map((code) => (
              <li key={code}>
                {code}: {byCode.has(code) ? (byCode.get(code) ? it.guardianBoxAuthorized : it.guardianBoxRefused) : "—"}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        <ButtonLink href="/area">{it.backToArea}</ButtonLink>
      </p>
    </div>
  );
}
