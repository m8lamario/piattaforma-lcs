import Link from "next/link";
import type {
  ChecklistItem,
  MedicalEvidence,
  RegistrationStatus,
} from "@/features/registrations/domain/requirements";
import {
  nextHero,
  WIZARD_STEPS,
  type NextHero,
  type WizardStepId,
} from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { IdentityConflictPanel } from "@/features/players/ui/IdentityConflictPanel";
import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import type { EditionWindow } from "@/features/registrations/domain/window";
import styles from "./Dashboard.module.css";

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

const ITEM_LABEL: Record<ChecklistItem["code"], string> = {
  PERSONAL_DATA: it.stepDati,
  GUARDIAN_IF_MINOR: it.stepTutore,
  MEDICAL_CERT: it.stepCertificato,
  PRIVACY: it.stepPrivacy,
  MEDIA_RELEASE: it.stepLiberatorie,
  PAYMENT: it.stepPagamento,
};

const ITEM_HREF: Record<ChecklistItem["code"], WizardStepId> = {
  PERSONAL_DATA: "dati",
  GUARDIAN_IF_MINOR: "tutore",
  MEDICAL_CERT: "certificato",
  PRIVACY: "privacy",
  MEDIA_RELEASE: "liberatorie",
  PAYMENT: "pagamento",
};

const ITEM_TONE: Record<ChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  not_applicable: "neutral",
};

const SEG_CLASS: Record<ChecklistItem["status"], string | undefined> = {
  complete: styles.seg_complete,
  todo: styles.seg_todo,
  attention: styles.seg_attention,
  not_applicable: undefined,
};

function heroText(hero: NextHero, medicalStatus?: MedicalEvidence) {
  if (hero.code === "DONE") return it.heroDone;
  if (hero.code === "PERSONAL_DATA") return it.heroPersonal;
  if (hero.code === "GUARDIAN_IF_MINOR") return it.heroGuardian;
  if (hero.code === "MEDICAL_CERT") {
    if (hero.status === "attention") {
      if (medicalStatus === "rejected" || medicalStatus === "expired") {
        return it.heroMedicalRejected;
      }
      return it.heroMedicalPending;
    }
    return hero.implemented ? it.heroMedical : it.heroMedicalSoon;
  }
  if (hero.code === "PRIVACY") return hero.implemented ? it.heroPrivacy : it.heroPrivacySoon;
  if (hero.code === "MEDIA_RELEASE") return hero.implemented ? it.heroMedia : it.heroMediaSoon;
  return hero.implemented ? it.heroPayment : it.heroPaymentSoon;
}

type Props = {
  competitionName: string;
  editionName: string;
  teamName: string;
  status: RegistrationStatus;
  checklist: ChecklistItem[];
  medicalStatus?: MedicalEvidence;
  registrationId: string;
  editionWindow: EditionWindow;
  identityConflict?: { code: string } | null;
};

export function RegistrationDashboard({
  competitionName,
  editionName,
  teamName,
  status,
  checklist,
  medicalStatus,
  registrationId,
  editionWindow,
  identityConflict,
}: Props) {
  const hero = nextHero(checklist);
  const hrefStep = hero.code === "DONE" ? "riepilogo" : (ITEM_HREF[hero.code] ?? "dati");
  const visible = checklist.filter((item) => item.status !== "not_applicable");
  const doneCount = visible.filter((item) => item.status === "complete").length;
  const blocked = Boolean(identityConflict);
  const settled =
    hero.code === "DONE" ||
    status === "APPROVED" ||
    status === "WITHDRAWN" ||
    status === "REMOVED" ||
    blocked;
  const heroCopy = blocked
    ? it.identityHeroBlocked
    : status === "WITHDRAWN"
      ? it.heroWithdrawn
      : status === "REMOVED"
        ? it.heroRemoved
        : status === "APPROVED"
          ? it.heroApproved
          : hero.code === "DONE"
            ? it.heroPendingNow
            : heroText(hero, medicalStatus);

  return (
    <section className={styles.wrap}>
      <PageHeader
        kicker={`${competitionName} · ${editionName}`}
        title={it.areaTitle}
        description={`${it.teamTitle}: ${teamName}`}
        aside={<StatusChip tone={STATUS_TONE[status]}>{STATUS_COPY[status]}</StatusChip>}
      />
      <WindowNotice edition={editionWindow} />
      {blocked ? <IdentityConflictPanel registrationId={registrationId} /> : null}
      <p className={styles.note}>{it.guardianEmailNote}</p>

      <div className={styles.hero}>
        <p className={styles.heroCopy}>{heroCopy}</p>
        <div className={styles.heroActions}>
          {settled ? null : <ButtonLink href={`/area/registrazione/${hrefStep}`}>{it.ctaContinue}</ButtonLink>}
          {status !== "WITHDRAWN" && status !== "REMOVED" && !blocked ? (
            <WithdrawForm registrationId={registrationId} />
          ) : null}
        </div>
      </div>

      <div className={styles.progressBlock}>
        <p className={styles.progressLabel}>
          {it.checklistProgress.replace("{done}", String(doneCount)).replace("{total}", String(visible.length))}
        </p>
        <div className={styles.segments} aria-hidden="true">
          {visible.map((item) => (
            <span key={item.code} className={`${styles.segment} ${SEG_CLASS[item.status] ?? ""}`} />
          ))}
        </div>
      </div>

      <h2 className={styles.listTitle}>{it.checklistTitle}</h2>
      <ol className={styles.list}>
        {visible.map((item, index) => {
          const implemented = WIZARD_STEPS.find((step) => step.code === item.code)?.implemented ?? true;
          return (
            <li key={item.code}>
              <Link href={`/area/registrazione/${ITEM_HREF[item.code]}`} className={styles.item}>
                <span className={styles.index} aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <strong>{ITEM_LABEL[item.code]}</strong>
                  <span className={styles.meta}>
                    {!implemented ? it.checklistUpcoming : it.checklistOpenStep}
                  </span>
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
    </section>
  );
}
