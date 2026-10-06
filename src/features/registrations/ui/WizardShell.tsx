"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
import { Icon } from "@/shared/ui/Icon";
import {
  WIZARD_STEP_ICONS,
  WIZARD_STEP_LABELS,
  WIZARD_STEP_LEADS,
  WIZARD_STEP_TIPS,
} from "./wizardCopy";
import styles from "./WizardShell.module.css";

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

function StepMark({
  index,
  status,
  active,
  className,
}: {
  index: number;
  status: ChecklistItem["status"];
  active: boolean;
  className: string;
}) {
  const doneTick = status === "complete";
  const attention = status === "attention" && !active;
  return (
    <span
      className={`${className} ${doneTick ? styles.markDone : ""} ${active ? styles.markActive : ""} ${attention ? styles.markAttention : ""}`}
      aria-hidden="true"
    >
      {doneTick ? <Icon name="check" size={12} /> : attention ? <Icon name="alert" size={12} /> : index + 1}
    </span>
  );
}

export function WizardShell({ step, steps, checklist, children }: Props) {
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const previous = steps[steps.indexOf(step) - 1];
  const { done, total } = completedStepCount(checklist);
  const progress = it.wizardProgress.replace("{done}", String(done)).replace("{total}", String(total));
  const featured = step === "liberatorie";
  const solemn = step === "privacy";
  const fill = total === 0 ? "0%" : `${Math.round((done / total) * 100)}%`;
  const kicker = solemn ? it.wizardKickerPrivacy : featured ? it.wizardKickerMedia : null;
  const laterHref = laterHrefFor(step, checklist);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [step, reduceMotion]);

  return (
    <div className={styles.canvas}>
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
            const statusLabel = statusCopy(status, active);
            return (
              <li key={id} className={styles.stepItem} ref={active ? activeStepRef : undefined}>
                <Link
                  href={`/area/registrazione/${id}`}
                  className={`${styles.step} ${active ? styles.stepActive : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <StepMark index={index} status={status} active={active} className={styles.tick} />
                  <span className={styles.stepLabel}>
                    {WIZARD_STEP_LABELS[id]}
                    <span className="srOnly">{` (${statusLabel})`}</span>
                  </span>
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
                {it.wizardBack}
              </Link>
            ) : (
              <Link href="/area" className={styles.back}>
                <Icon name="back" size={16} />
                {it.backToArea}
              </Link>
            )}
            {laterHref ? (
              <Link href={laterHref} className={styles.laterMobile}>
                {it.completeLater}
              </Link>
            ) : null}
          </div>

          <header className={styles.heading}>
            <span className={styles.headingIcon} aria-hidden="true">
              <Icon name={WIZARD_STEP_ICONS[step]} size={22} />
            </span>
            <div className={styles.headingText}>
              {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
              <h1 ref={headingRef} tabIndex={-1}>
                {WIZARD_STEP_LABELS[step]}
              </h1>
              <p className={styles.lead}>{WIZARD_STEP_LEADS[step]}</p>
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
                const statusLabel = statusCopy(status, active);

                return (
                  <li key={id} className={`${styles.journeyItem} ${active ? styles.journeyItemActive : ""}`}>
                    <Link
                      href={`/area/registrazione/${id}`}
                      className={styles.journeyLink}
                      aria-current={active ? "step" : undefined}
                    >
                      <StepMark index={index} status={status} active={active} className={styles.journeyTick} />
                      <span className={styles.journeyInfo}>
                        <span className={styles.journeyLabel}>{WIZARD_STEP_LABELS[id]}</span>
                        <span className={styles.journeyStatus}>{statusLabel}</span>
                      </span>
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
              <p className={styles.tipText}>{WIZARD_STEP_TIPS[step]}</p>
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
