"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { WizardStepId } from "@/features/registrations/domain/wizard";
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
  children: ReactNode;
};

export function WizardShell({ step, steps, children }: Props) {
  const reduceMotion = useReducedMotion();
  const current = Math.max(1, steps.indexOf(step) + 1);
  const previous = steps[steps.indexOf(step) - 1];
  const progress = it.wizardProgress
    .replace("{current}", String(current))
    .replace("{total}", String(steps.length));
  const featured = step === "liberatorie";
  const solemn = step === "privacy";
  const fill = `${Math.round((current / steps.length) * 100)}%`;
  const kicker = solemn ? it.wizardKickerPrivacy : featured ? it.wizardKickerMedia : null;

  return (
    <div className={styles.canvas}>
      {/* Mobile progress indicator */}
      <div className={styles.mobileProgress}>
        <div className={styles.progressRow}>
          <p className={styles.progress}>
            <span className="srOnly">{progress}</span>
            <span aria-hidden="true">
              {current}
              <span className={styles.of}>/{steps.length}</span>
            </span>
          </p>
          <div className={styles.track} aria-hidden="true">
            <span className={styles.trackFill} style={{ width: fill }} />
          </div>
        </div>

        <ol className={styles.steps} aria-label={progress}>
          {steps.map((id, index) => {
            const active = id === step;
            const done = index < current - 1;
            return (
              <li key={id} className={styles.stepItem}>
                <Link
                  href={`/area/registrazione/${id}`}
                  className={`${styles.step} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={styles.tick} aria-hidden="true">
                    {done ? <Icon name="check" size={12} /> : index + 1}
                  </span>
                  <span className={styles.stepLabel}>{LABELS[id]}</span>
                </Link>
              </li>
            );
          })}
        </ol>
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
                const done = index < current - 1;
                const accessible = done || active;
                const statusLabel = done
                  ? it.wizardStepCompleted
                  : active
                    ? it.wizardStepCurrent
                    : it.wizardStepUpcoming;

                const content = (
                  <>
                    <span className={`${styles.journeyTick} ${done ? styles.journeyDone : ""} ${active ? styles.journeyActive : ""}`}>
                      {done ? <Icon name="check" size={12} /> : index + 1}
                    </span>
                    <span className={styles.journeyInfo}>
                      <span className={styles.journeyLabel}>{LABELS[id]}</span>
                      <span className={styles.journeyStatus}>{statusLabel}</span>
                    </span>
                  </>
                );

                return (
                  <li key={id} className={`${styles.journeyItem} ${active ? styles.journeyItemActive : ""}`}>
                    {accessible ? (
                      <Link href={`/area/registrazione/${id}`} className={styles.journeyLink} aria-current={active ? "step" : undefined}>
                        {content}
                      </Link>
                    ) : (
                      <div className={styles.journeyStatic}>{content}</div>
                    )}
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
