import { it } from "@/shared/i18n/it";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { LegalReader } from "./LegalReader";
import type { ConsentDocumentView } from "./PrivacyConsentForm";
import styles from "./ConsentForm.module.css";
import fields from "@/shared/ui/form.module.css";

type Props = {
  status: "none" | "pending" | "authorized" | "refused";
  documents: ConsentDocumentView[];
  boxes: ConsentBoxDef[];
  currentBoxes: Record<string, boolean>;
};

function labelFor(code: string, current: Record<string, boolean>, status: Props["status"]) {
  if (status === "refused") return it.guardianBoxRefused;
  if (code in current) return current[code] ? it.guardianBoxAuthorized : it.guardianBoxRefused;
  if (status === "authorized") return it.guardianBoxAuthorized;
  return it.guardianBoxWaiting;
}

export function GuardianWaitingView({ status, documents, boxes, currentBoxes }: Props) {
  return (
    <div className={fields.form}>
      <p className={`${fields.banner} ${status === "refused" ? fields.bannerDanger : fields.bannerInfo}`} role="status">
        <strong>{it.guardianWaitingTitle}</strong>
        <span> {status === "authorized" ? it.guardianBoxAuthorized : it.guardianWaitingBody}</span>
      </p>
      {documents.map((document) => (
        <article key={document.slug} className={styles.block}>
          <LegalReader document={document} read />
        </article>
      ))}
      <div>
        {boxes.map((box) => (
          <p key={box.code} className={styles.check}>
            <span className={styles.boxCode}>{box.code}</span>
            <span>{it[box.labelKey]}</span>
            <span className={styles.version}>{labelFor(box.code, currentBoxes, status)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
