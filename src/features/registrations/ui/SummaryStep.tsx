import Link from "next/link";
import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { WIZARD_STEPS } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import styles from "./WizardForm.module.css";

const ITEM_LABEL: Record<ChecklistItem["code"], string> = {
  PERSONAL_DATA: it.stepDati,
  GUARDIAN_IF_MINOR: it.stepTutore,
  MEDICAL_CERT: it.stepCertificato,
  PRIVACY: it.stepPrivacy,
  MEDIA_RELEASE: it.stepLiberatorie,
  PAYMENT: it.stepPagamento,
};

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  complete: it.checklistComplete,
  todo: it.checklistTodo,
  attention: it.checklistAttention,
  not_applicable: it.checklistNA,
};

type Props = {
  checklist: ChecklistItem[];
};

export function SummaryStep({ checklist }: Props) {
  return (
    <div className={styles.placeholder}>
      <p>{it.summaryIntro}</p>
      <ul>
        {checklist
          .filter((item) => item.status !== "not_applicable")
          .map((item) => {
            const step = WIZARD_STEPS.find((entry) => entry.code === item.code);
            return (
              <li key={item.code}>
                {ITEM_LABEL[item.code]}: {STATUS_LABEL[item.status]}
                {step && !step.implemented ? " (prossima fase)" : ""}
              </li>
            );
          })}
      </ul>
      <p>
        <Link href="/area">{it.backToArea}</Link>
      </p>
    </div>
  );
}
