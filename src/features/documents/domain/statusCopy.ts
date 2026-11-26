import { it } from "@/shared/i18n/it";
import type { StatusTone } from "@/shared/ui/StatusChip";

export function documentStatusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  if (status === "EXPIRED") return it.statusDocumentEXPIRED;
  if (status === "PREVALIDATED") return it.statusDocumentPREVALIDATED;
  if (status === "PROCESSING") return it.statusDocumentPROCESSING;
  if (status === "UPLOADED") return it.statusDocumentUPLOADED;
  return it.statusDocumentPENDING_REVIEW;
}

export function documentStatusTone(status: string): StatusTone {
  if (status === "APPROVED" || status === "PREVALIDATED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}
