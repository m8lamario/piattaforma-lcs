import Link from "next/link";
import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { WIZARD_STEPS } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { requirementHref, requirementLabel, requirementLead } from "./wizardCopy";
import styles from "./Dashboard.module.css";

const ITEM_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

type Props = {
  checklist: ChecklistItem[];
};

export function ChecklistLinks({ checklist }: Props) {
  const visible = checklist.filter((item) => item.status !== "not_applicable");

  return (
    <ol className={styles.list}>
      {visible.map((item, index) => {
        const implemented = WIZARD_STEPS.find((step) => step.code === item.code)?.implemented ?? true;
        return (
          <li key={item.code}>
            <Link
              href={requirementHref(item.code)}
              className={`${styles.item} ${item.status === "attention" ? styles.itemAttention : ""}`}
            >
              <span className={styles.index} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.itemContent}>
                <strong>{requirementLabel(item.code)}</strong>
                <span className={styles.meta}>{implemented ? requirementLead(item.code) : it.checklistUpcoming}</span>
              </span>
              <StatusChip tone={ITEM_TONE[item.status]}>
                {item.status === "complete"
                  ? it.checklistComplete
                  : item.status === "attention"
                    ? it.checklistAttention
                    : it.checklistTodo}
              </StatusChip>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
