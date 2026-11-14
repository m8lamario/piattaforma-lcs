import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { WIZARD_STEPS } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import type { StatusTone } from "@/shared/ui/StatusChip";
import { TaskList } from "@/shared/ui/TaskList";
import { requirementHref, requirementLabel, requirementLead } from "./wizardCopy";

const ITEM_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

const STATUS_COPY: Record<ChecklistItem["status"], string> = {
  complete: it.checklistComplete,
  todo: it.checklistTodo,
  attention: it.checklistAttention,
  not_applicable: it.checklistTodo,
};

type Props = {
  checklist: ChecklistItem[];
};

export function ChecklistLinks({ checklist }: Props) {
  const visible = checklist.filter((item) => item.status !== "not_applicable");

  return (
    <TaskList
      ordered
      items={visible.map((item, index) => {
        const implemented = WIZARD_STEPS.find((step) => step.code === item.code)?.implemented ?? true;
        return {
          id: item.code,
          title: requirementLabel(item.code),
          meta: implemented ? requirementLead(item.code) : it.checklistUpcoming,
          href: requirementHref(item.code),
          index: index + 1,
          tone: ITEM_TONE[item.status],
          status: STATUS_COPY[item.status],
        };
      })}
    />
  );
}
