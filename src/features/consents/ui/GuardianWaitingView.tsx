import { it } from "@/shared/i18n/it";
import { isGatedMinorMediaCode, type ConsentBoxDef } from "@/features/consents/domain/boxes";
import { LegalReader } from "./LegalReader";
import type { ConsentDocumentView } from "./consentDocument";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { ButtonLink } from "@/shared/ui/Button";
import { WizardLaterButton } from "@/features/registrations/ui/WizardShell";
import { healthConsentLabels, type MedicalCertificateKind } from "@/features/documents/domain/medicalRequirement";
import styles from "./ConsentForm.module.css";
import fields from "@/shared/ui/form.module.css";

type Props = {
  status: "none" | "pending" | "authorized" | "refused";
  documents: ConsentDocumentView[];
  boxes: ConsentBoxDef[];
  currentBoxes: Record<string, boolean>;
  medicalKind?: MedicalCertificateKind;
  pendingOtherParent?: boolean;
};

function pendingMedia(code: string, current: Record<string, boolean>, pendingOtherParent: boolean) {
  return pendingOtherParent && isGatedMinorMediaCode(code) && current[code] === true;
}

function labelFor(
  code: string,
  current: Record<string, boolean>,
  status: Props["status"],
  pendingOtherParent: boolean,
) {
  if (status === "refused") return it.guardianBoxRefused;
  if (pendingMedia(code, current, pendingOtherParent)) return it.guardianBoxPendingOtherParent;
  if (code in current) return current[code] ? it.guardianBoxAuthorized : it.guardianBoxRefused;
  if (status === "authorized") return it.guardianBoxAuthorized;
  return it.guardianBoxWaiting;
}

function toneFor(
  code: string,
  current: Record<string, boolean>,
  status: Props["status"],
  pendingOtherParent: boolean,
): StatusTone {
  if (status === "refused") return "danger";
  if (pendingMedia(code, current, pendingOtherParent)) return "attention";
  if (code in current) return current[code] ? "complete" : "danger";
  if (status === "authorized") return "complete";
  return "attention";
}

export function GuardianWaitingView({
  status,
  documents,
  boxes,
  currentBoxes,
  medicalKind = "COMPETITIVE",
  pendingOtherParent = false,
}: Props) {
  const healthLabels = healthConsentLabels(medicalKind);
  const bannerTitle = pendingOtherParent ? it.publicationPending : it.guardianWaitingTitle;
  const bannerBody = pendingOtherParent
    ? it.guardianWaitingOtherParentBody
    : status === "authorized"
      ? it.guardianBoxAuthorized
      : it.guardianWaitingBody;
  return (
    <div className={fields.form}>
      <p
        className={`${fields.banner} ${
          status === "refused" ? fields.bannerDanger : pendingOtherParent ? fields.bannerWarn : fields.bannerInfo
        }`}
        role="status"
      >
        <strong>{bannerTitle}</strong>
        <span> {bannerBody}</span>
      </p>
      {documents.map((document) => (
        <article key={document.slug} className={styles.block}>
          <LegalReader document={document} read />
        </article>
      ))}
      <div className={styles.choiceList}>
        {boxes.map((box) => (
          <div key={box.code} className={styles.check}>
            <span className={styles.boxCode}>{box.code}</span>
            <span style={{ flex: 1 }}>{healthLabels[box.code] ?? it[box.labelKey]}</span>
            <StatusChip tone={toneFor(box.code, currentBoxes, status, pendingOtherParent)}>
              {labelFor(box.code, currentBoxes, status, pendingOtherParent)}
            </StatusChip>
          </div>
        ))}
      </div>

      <div className={`${fields.actions} ${fields.sticky}`}>
        <WizardLaterButton />
        <ButtonLink href="/area" variant="ghost">
          {it.backToArea}
        </ButtonLink>
      </div>
    </div>
  );
}
