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

const STATUS_ICON: Record<ChecklistItem["status"], string> = {
  complete: "●",
  todo: "○",
  attention: "!",
  not_applicable: "–",
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
};

export function RegistrationDashboard({
  competitionName,
  editionName,
  teamName,
  status,
  checklist,
  medicalStatus,
}: Props) {
  const hero = nextHero(checklist);
  const hrefStep =
    hero.code === "DONE" ? "riepilogo" : (ITEM_HREF[hero.code] ?? "dati");
  const visible = checklist.filter((item) => item.status !== "not_applicable");

  return (
    <section className={styles.wrap}>
      <p className={styles.kicker}>
        {competitionName} · {editionName}
      </p>
      <h1>{it.areaTitle}</h1>
      <p>
        Squadra: <strong>{teamName}</strong>
      </p>
      <p className={styles.status} role="status">
        {STATUS_COPY[status]}
      </p>
      <p className={styles.hero}>{heroText(hero, medicalStatus)}</p>
      <p>
        <Link className={styles.cta} href={`/area/registrazione/${hrefStep}`}>
          {it.ctaContinue}
        </Link>
      </p>

      <div className={styles.segments} aria-hidden="true">
        {visible.map((item) => (
          <span key={item.code} className={`${styles.segment} ${SEG_CLASS[item.status] ?? ""}`} />
        ))}
      </div>

      <h2>{it.checklistTitle}</h2>
      <ul className={styles.list}>
        {visible.map((item) => {
          const implemented = WIZARD_STEPS.find((step) => step.code === item.code)?.implemented ?? true;
          return (
            <li key={item.code}>
              <Link href={`/area/registrazione/${ITEM_HREF[item.code]}`} className={styles.item}>
                <span className={styles.icon} aria-hidden="true">
                  {STATUS_ICON[item.status]}
                </span>
                <span>
                  <strong>{ITEM_LABEL[item.code]}</strong>
                  <span className={styles.meta}>
                    {item.status === "complete"
                      ? it.checklistComplete
                      : item.status === "attention"
                        ? it.checklistAttention
                        : it.checklistTodo}
                    {!implemented ? " · prossima fase" : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
