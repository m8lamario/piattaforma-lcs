import type { ChecklistItem, MedicalEvidence, RegistrationStatus } from "@/features/registrations/domain/requirements";
import { nextHero } from "@/features/registrations/domain/wizard";
import { requirementHref, requirementLabel } from "@/features/registrations/ui/wizardCopy";
import type { PublicationFlags } from "@/features/consents/domain/boxes";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { ButtonLink } from "@/shared/ui/Button";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/teams/ui/RepresentativeDashboard.module.css";

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

type Props = {
  status: RegistrationStatus;
  checklist: ChecklistItem[];
  medicalStatus: MedicalEvidence;
  publication?: PublicationFlags | null;
};

export function PersonalRegistrationPanel({ status, checklist, medicalStatus, publication }: Props) {
  const hero = nextHero(checklist);
  const missing = checklist.find((item) => item.status === "attention" || (item.required && item.status === "todo"));
  const settled = hero.code === "DONE" || status === "APPROVED" || status === "WITHDRAWN" || status === "REMOVED";
  const href = hero.code === "DONE" ? "/area/registrazione/riepilogo" : requirementHref(hero.code);

  return (
    <section className={styles.section}>
      <h2>{it.areaPersonalTitle}</h2>
      <div className={styles.personalChips}>
        <StatusChip tone={STATUS_TONE[status]}>{STATUS_COPY[status]}</StatusChip>
        <StatusChip tone={medicalStatus === "approved" ? "complete" : medicalStatus === "none" ? "todo" : "attention"}>
          {MEDICAL[medicalStatus]}
        </StatusChip>
        {publication ? <PublicationChips flags={publication} compact /> : null}
      </div>
      {missing && !settled ? (
        <p className={styles.personalMeta}>{it.areaPersonalMissing.replace("{step}", requirementLabel(missing.code))}</p>
      ) : (
        <p className={styles.personalMeta}>{it.areaPersonalDone}</p>
      )}
      {settled ? null : (
        <div className={styles.personalActions}>
          <ButtonLink href={href}>{it.areaPersonalCta}</ButtonLink>
        </div>
      )}
    </section>
  );
}
