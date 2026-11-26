import type { ChecklistItem, MedicalEvidence, RegistrationStatus } from "@/features/registrations/domain/requirements";
import type { PublicationFlags } from "@/features/consents/domain/boxes";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { ChecklistLinks } from "@/features/registrations/ui/ChecklistLinks";
import { ProgressMeter } from "@/shared/ui/ProgressMeter";
import { registrationStatusLabel, registrationStatusTone } from "@/features/registrations/domain/statusCopy";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "./PersonalRegistrationPanel.module.css";

const MEDICAL: Record<MedicalEvidence, string> = {
  none: it.rosterMedicalNone,
  pending: it.rosterMedicalPending,
  approved: it.rosterMedicalApproved,
  rejected: it.rosterMedicalRejected,
  expired: it.rosterMedicalExpired,
};

const SEGMENT_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

type Props = {
  status: RegistrationStatus;
  checklist: ChecklistItem[];
  medicalStatus: MedicalEvidence;
  sportEligible?: boolean;
  category?: "PLAYER" | "STAFF";
  publication?: PublicationFlags | null;
  shirtSizeDue?: boolean;
};

export function PersonalRegistrationPanel({
  status,
  checklist,
  medicalStatus,
  sportEligible = true,
  category = "PLAYER",
  publication,
  shirtSizeDue = false,
}: Props) {
  const visible = checklist.filter((item) => item.status !== "not_applicable");
  const doneCount = visible.filter((item) => item.status === "complete").length;
  const settled =
    status === "WITHDRAWN" ||
    status === "REMOVED" ||
    (status === "APPROVED" && (category === "STAFF" || sportEligible));
  return (
    <div className={styles.panel}>
      <div className={styles.chips}>
        <StatusChip tone={registrationStatusTone(status)}>{registrationStatusLabel(status)}</StatusChip>
        <StatusChip tone="neutral">{category === "STAFF" ? it.categoryStaff : it.categoryPlayer}</StatusChip>
        {category === "STAFF" ? null : (
          <>
            <StatusChip tone={medicalStatus === "approved" ? "complete" : medicalStatus === "none" ? "todo" : "attention"}>
              {MEDICAL[medicalStatus]}
            </StatusChip>
            <StatusChip tone={sportEligible ? "complete" : "attention"}>
              {sportEligible ? it.medicalEligibilityYes : it.medicalEligibilityNo}
            </StatusChip>
          </>
        )}
        {publication ? <PublicationChips flags={publication} compact /> : null}
      </div>
      {settled ? (
        <p className={styles.meta}>{it.areaPersonalDone}</p>
      ) : (
        <>
          <ProgressMeter
            done={doneCount}
            total={visible.length}
            label={it.checklistProgress.replace("{done}", String(doneCount)).replace("{total}", String(visible.length))}
            caption={shirtSizeDue ? it.shirtSizeBanner : it.repNextProgress}
            segments={visible.map((item) => SEGMENT_TONE[item.status])}
          />
          <ChecklistLinks checklist={checklist} />
        </>
      )}
    </div>
  );
}
