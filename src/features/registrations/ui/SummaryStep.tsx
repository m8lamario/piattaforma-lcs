import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { WIZARD_STEPS } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { ButtonLink } from "@/shared/ui/Button";
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

const STATUS_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

type Props = {
  checklist: ChecklistItem[];
};

export function SummaryStep({ checklist }: Props) {
  return (
    <div className={styles.placeholder}>
      <p>{it.summaryIntro}</p>
      <p>{it.summaryWhatNow}</p>
      <ul className={styles.summaryList}>
        {checklist
          .filter((item) => item.status !== "not_applicable")
          .map((item) => {
            const step = WIZARD_STEPS.find((entry) => entry.code === item.code);
            return (
              <li key={item.code} className={styles.summaryItem}>
                <span>
                  {ITEM_LABEL[item.code]}
                  {step && !step.implemented ? ` · ${it.nextPhase}` : ""}
                </span>
                <StatusChip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
              </li>
            );
          })}
      </ul>
      <p>
        <ButtonLink href="/area" variant="ghost" icon="back">
          {it.backToArea}
        </ButtonLink>
      </p>
    </div>
  );
}
