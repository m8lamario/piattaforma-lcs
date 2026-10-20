import type { ChecklistItem, MedicalEvidence, RegistrationStatus } from "@/features/registrations/domain/requirements";
import type { PublicationFlags } from "@/features/consents/domain/boxes";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { ChecklistLinks } from "@/features/registrations/ui/ChecklistLinks";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/teams/ui/RepresentativeDashboard.module.css";
import progress from "@/features/registrations/ui/Dashboard.module.css";

const STATUS_COPY: Record<RegistrationStatus, string> = {
  INVITED: it.statusINVITED,
  ACCOUNT_CREATED: it.statusACCOUNT_CREATED,
  IN_PROGRESS: it.statusIN_PROGRESS,
  PENDING_REVIEW: it.statusPENDING_REVIEW,
  CHANGES_REQUESTED: it.statusCHANGES_REQUESTED,
  PAYMENT_PENDING: it.statusPAYMENT_PENDING,
  APPROVED: it.statusAPPROVED,
  WITHDRAWN: it.statusWITHDRAWN,
  REMOVED: it.statusREMOVED,
};

const STATUS_TONE: Record<RegistrationStatus, StatusTone> = {
  INVITED: "todo",
  ACCOUNT_CREATED: "todo",
  IN_PROGRESS: "attention",
  PENDING_REVIEW: "attention",
  CHANGES_REQUESTED: "attention",
  PAYMENT_PENDING: "attention",
  APPROVED: "complete",
  WITHDRAWN: "neutral",
  REMOVED: "neutral",
};

const MEDICAL: Record<MedicalEvidence, string> = {
  none: it.rosterMedicalNone,
  pending: it.rosterMedicalPending,
  approved: it.rosterMedicalApproved,
  rejected: it.rosterMedicalRejected,
  expired: it.rosterMedicalExpired,
};

const SEG_CLASS: Record<ChecklistItem["status"], string | undefined> = {
  complete: progress.seg_complete,
  todo: progress.seg_todo,
  attention: progress.seg_attention,
  not_applicable: undefined,
};

type Props = {
  status: RegistrationStatus;
  checklist: ChecklistItem[];
  medicalStatus: MedicalEvidence;
  category?: "PLAYER" | "STAFF";
  publication?: PublicationFlags | null;
  shirtSizeDue?: boolean;
};

export function PersonalRegistrationPanel({
  status,
  checklist,
  medicalStatus,
  category = "PLAYER",
  publication,
  shirtSizeDue = false,
}: Props) {
  const visible = checklist.filter((item) => item.status !== "not_applicable");
  const doneCount = visible.filter((item) => item.status === "complete").length;
  const settled = status === "APPROVED" || status === "WITHDRAWN" || status === "REMOVED";
  return (
    <div className={styles.section}>
      <div className={styles.personalChips}>
        <StatusChip tone={STATUS_TONE[status]}>{STATUS_COPY[status]}</StatusChip>
        <StatusChip tone="neutral">{category === "STAFF" ? it.categoryStaff : it.categoryPlayer}</StatusChip>
        {category === "STAFF" ? null : (
          <StatusChip tone={medicalStatus === "approved" ? "complete" : medicalStatus === "none" ? "todo" : "attention"}>
            {MEDICAL[medicalStatus]}
          </StatusChip>
        )}
        {publication ? <PublicationChips flags={publication} compact /> : null}
      </div>
      <p className={styles.personalMeta}>
        {settled
          ? it.areaPersonalDone
          : shirtSizeDue
            ? it.shirtSizeBanner
            : it.checklistProgress.replace("{done}", String(doneCount)).replace("{total}", String(visible.length))}
      </p>
      {settled ? null : (
        <>
          <div className={progress.segments} aria-hidden="true">
            {visible.map((item) => (
              <span key={item.code} className={`${progress.segment} ${SEG_CLASS[item.status] ?? ""}`} />
            ))}
          </div>
          <ChecklistLinks checklist={checklist} />
        </>
      )}
    </div>
  );
}
