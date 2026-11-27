import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { WIZARD_STEPS } from "@/features/registrations/domain/wizard";
import { GuardianResendButton, type GuardianResendTarget } from "@/features/players/ui/GuardianResendButton";
import { it } from "@/shared/i18n/it";
import { TaskList } from "@/shared/ui/TaskList";
import { dashboardChecklistTone } from "./dashboardChecklist";
import { requirementHref, requirementLabel, requirementLead } from "./wizardCopy";

const STATUS_COPY: Record<ChecklistItem["status"], string> = {
  complete: it.checklistComplete,
  todo: it.checklistTodo,
  attention: it.checklistAttention,
  not_applicable: it.checklistTodo,
};

type Props = {
  checklist: ChecklistItem[];
  publicationPending?: boolean;
  guardianResend?: GuardianResendTarget | null;
};

export function ChecklistLinks({ checklist, publicationPending = false, guardianResend = null }: Props) {
  const visible = checklist.filter((item) => item.status !== "not_applicable");

  return (
    <TaskList
      ordered
      items={visible.map((item, index) => {
        const implemented = WIZARD_STEPS.find((step) => step.code === item.code)?.implemented ?? true;
        const waitingParent = publicationPending && item.code === "GUARDIAN_IF_MINOR";
        const tone = dashboardChecklistTone(item, publicationPending);
        return {
          id: item.code,
          title: requirementLabel(item.code),
          meta: waitingParent
            ? it.heroOtherParentPending
            : implemented
              ? requirementLead(item.code)
              : it.checklistUpcoming,
          href: requirementHref(item.code),
          index: index + 1,
          tone,
          status: waitingParent ? it.publicationPending : STATUS_COPY[item.status],
          action:
            item.code === "GUARDIAN_IF_MINOR" && guardianResend ? (
              <GuardianResendButton target={guardianResend} />
            ) : undefined,
        };
      })}
    />
  );
}
