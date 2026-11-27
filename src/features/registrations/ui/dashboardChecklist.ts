import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import type { StatusTone } from "@/shared/ui/StatusChip";

const ITEM_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

export function dashboardChecklistTone(
  item: Pick<ChecklistItem, "code" | "status">,
  publicationPending: boolean,
): StatusTone {
  if (publicationPending && item.code === "GUARDIAN_IF_MINOR") return "attention";
  return ITEM_TONE[item.status];
}
