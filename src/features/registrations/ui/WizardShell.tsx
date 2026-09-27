"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import {
  completedStepCount,
  isSkippableStep,
  isStepIncomplete,
  nextIncompleteAfter,
  statusForWizardStep,
  type WizardStepId,
} from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "./WizardShell.module.css";

const LABELS: Record<WizardStepId, string> = {
  dati: it.stepDati,
  tutore: it.stepTutore,
  certificato: it.stepCertificato,
  privacy: it.stepPrivacy,
  liberatorie: it.stepLiberatorie,
  pagamento: it.stepPagamento,
  riepilogo: it.stepRiepilogo,
};

const LEADS: Record<WizardStepId, string> = {
  dati: it.stepDatiLead,
  tutore: it.stepTutoreLead,
  certificato: it.stepCertificatoLead,
  privacy: it.stepPrivacyLead,
  liberatorie: it.stepLiberatorieLead,
  pagamento: it.stepPagamentoLead,
  riepilogo: it.stepRiepilogoLead,
};

const TIPS: Record<WizardStepId, string> = {
  dati: it.stepDatiTip,
  tutore: it.stepTutoreTip,
  certificato: it.stepCertificatoTip,
  privacy: it.stepPrivacyTip,
  liberatorie: it.stepLiberatorieTip,
  pagamento: it.stepPagamentoTip,
  riepilogo: it.stepRiepilogoTip,
};

const STEP_ICONS: Record<WizardStepId, IconName> = {
  dati: "user",
  tutore: "users",
  certificato: "medical",
  privacy: "privacy",
  liberatorie: "camera",
  pagamento: "payment",
  riepilogo: "summary",
};

type Props = {
  step: WizardStepId;
  steps: WizardStepId[];
  checklist: ChecklistItem[];
  children: ReactNode;
};

function laterHrefFor(step: WizardStepId, checklist: ChecklistItem[]) {
  if (!isSkippableStep(step) || !isStepIncomplete(step, checklist)) return null;
  const next = nextIncompleteAfter(step, checklist);
  if (next === "area") return "/area";
  return `/area/registrazione/${next}`;
}

function statusCopy(status: ChecklistItem["status"], active: boolean) {
  if (active) return it.wizardStepCurrent;
  if (status === "complete") return it.wizardStepCompleted;
  if (status === "attention") return it.wizardStepAttention;
  return it.wizardStepUpcoming;
}

export function WizardShell({ step, steps, checklist, children }: Props) {
  const reduceMotion = useReducedMotion();
  const previous = steps[steps.indexOf(step) - 1];
  const { done, total } = completedStepCount(checklist);
  const progress = it.wizardProgress.replace("{done}", String(done)).replace("{total}", String(total));
  const featured = step === "liberatorie";
  const solemn = step === "privacy";
  const fill = total === 0 ? "0%" : `${Math.round((done / total) * 100)}%`;
  const kicker = solemn ? it.wizardKickerPrivacy : featured ? it.wizardKickerMedia : null;
  const laterHref = laterHrefFor(step, checklist);

  return (
    <div className={styles.canvas}>
      {/* Mobile progress indicator */}
      <div className={styles.mobileProgress}>
        <div className={styles.progressRow}>
          <p className={styles.progress}>
            <span className="srOnly">{progress}</span>
            <span aria-hidden="true">
              {done}
              <span className={styles.of}>/{total}</span>
            </span>
          </p>
          <div className={styles.track} aria-hidden="true">
            <span className={styles.trackFill} style={{ width: fill }} />
          </div>
        </div>

        <ol className={styles.steps} aria-label={progress}>
          {steps.map((id, index) => {
            const active = id === step;
            const status = statusForWizardStep(id, checklist);
            const doneTick = status === "complete";
            return (
              <li key={id} className={styles.stepItem}>
                <Link
                  href={`/area/registrazione/${id}`}
                  className={`${styles.step} ${active ? styles.stepActive : ""} ${doneTick ? styles.stepDone : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={styles.tick} aria-hidden="true">
                    {doneTick ? <Icon name="check" size={12} /> : index + 1}
                  </span>
                  <span className={`${styles.stepLabel} srOnly`}>{LABELS[id]}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className={styles.currentLabel}>{LABELS[step]}</p>
      </div>

      <div className={styles.grid}>
        <section className={`${styles.mainStage} ${featured ? styles.featured : ""} ${solemn ? styles.solemn : ""}`}>
          <div className={styles.stageTop}>
            {previous ? (
              <Link href={`/area/registrazione/${previous}`} className={styles.back}>
                <Icon name="back" size={16} />
                {it.wizardBack}: {LABELS[previous]}
              </Link>
            ) : (
              <Link href="/area" className={styles.back}>
                <Icon name="back" size={16} />
                {it.backToArea}
              </Link>
            )}
          </div>

          <header className={styles.heading}>
            <span className={styles.headingIcon} aria-hidden="true">
              <Icon name={STEP_ICONS[step]} size={22} />
            </span>
            <div className={styles.headingText}>
              {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
              <h1>{LABELS[step]}</h1>
              <p className={styles.lead}>{LEADS[step]}</p>
            </div>
          </header>

          {laterHref ? (
            <p className={styles.later}>
              <Link href={laterHref}>{it.completeLater}</Link>
            </p>
          ) : null}

          <motion.div
            key={step}
            className={styles.stageBody}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
          >
            {children}
          </motion.div>
        </section>

        {/* Desktop Context & Journey Rail */}
        <aside className={styles.rail}>
          <div className={styles.railCard}>
            <div className={styles.railHeader}>
              <h2 className={styles.railTitle}>{it.wizardJourneyTitle}</h2>
              <span className={styles.railProgressText}>{progress}</span>
            </div>

            <div className={styles.railTrack} aria-hidden="true">
              <span className={styles.railTrackFill} style={{ width: fill }} />
            </div>

            <ol className={styles.journeyList} aria-label={it.wizardJourneyTitle}>
              {steps.map((id, index) => {
                const active = id === step;
                const status = statusForWizardStep(id, checklist);
                const doneTick = status === "complete";
                const attention = status === "attention";
                const statusLabel = statusCopy(status, active);

                const content = (
                  <>
                    <span
                      className={`${styles.journeyTick} ${doneTick ? styles.journeyDone : ""} ${active ? styles.journeyActive : ""} ${attention && !active ? styles.journeyAttention : ""}`}
                    >
                      {doneTick ? <Icon name="check" size={12} /> : index + 1}
                    </span>
                    <span className={styles.journeyInfo}>
                      <span className={styles.journeyLabel}>{LABELS[id]}</span>
                      <span className={styles.journeyStatus}>{statusLabel}</span>
                    </span>
                  </>
                );

                return (
                  <li key={id} className={`${styles.journeyItem} ${active ? styles.journeyItemActive : ""}`}>
                    <Link href={`/area/registrazione/${id}`} className={styles.journeyLink} aria-current={active ? "step" : undefined}>
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ol>

            <div className={styles.tipBox}>
              <div className={styles.tipHeader}>
                <Icon name="summary" size={16} />
                <strong>{it.wizardTipsTitle}</strong>
              </div>
              <p className={styles.tipText}>{TIPS[step]}</p>
            </div>

            <div className={styles.railFooter}>
              {laterHref ? (
                <Link href={laterHref} className={styles.railLaterLink}>
                  {it.completeLater}
                </Link>
              ) : null}
              <Link href="/area" className={styles.railBackLink}>
                {it.backToArea}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
