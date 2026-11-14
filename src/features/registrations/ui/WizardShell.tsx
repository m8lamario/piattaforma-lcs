"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
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
import { Disclosure } from "@/shared/ui/Disclosure";
import { Icon } from "@/shared/ui/Icon";
import { ButtonLink, type ButtonVariant } from "@/shared/ui/Button";
import {
  WIZARD_STEP_ICONS,
  WIZARD_STEP_LABELS,
  WIZARD_STEP_LEADS,
  WIZARD_STEP_TIPS,
} from "./wizardCopy";
import styles from "./WizardShell.module.css";

type WizardContextValue = {
  step: WizardStepId;
  steps: WizardStepId[];
  checklist: ChecklistItem[];
  laterHref: string | null;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  return useContext(WizardContext);
}

export function WizardLaterButton({
  className,
  variant = "quiet",
}: {
  className?: string;
  variant?: ButtonVariant;
}) {
  const ctx = useWizard();
  if (!ctx?.laterHref) return null;
  return (
    <ButtonLink href={ctx.laterHref} variant={variant} className={className}>
      {it.completeLater}
    </ButtonLink>
  );
}

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

function StepMark({ index, status, active }: { index: number; status: ChecklistItem["status"]; active: boolean }) {
  const doneTick = status === "complete" && !active;
  const attention = status === "attention" && !active;
  return (
    <span
      className={`${styles.mark} ${doneTick ? styles.markDone : ""} ${active ? styles.markActive : ""} ${attention ? styles.markAttention : ""}`}
      aria-hidden="true"
    >
      {doneTick ? <Icon name="check" size={14} /> : attention ? <Icon name="alert" size={14} /> : index + 1}
    </span>
  );
}

export function WizardShell({ step, steps, checklist, children }: Props) {
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const position = steps.indexOf(step);
  const previous = steps[position - 1];
  const { done, total } = completedStepCount(checklist);
  const progress = it.wizardProgress.replace("{done}", String(done)).replace("{total}", String(total));
  const featured = step === "liberatorie";
  const solemn = step === "privacy";
  const fill = total === 0 ? "0%" : `${Math.round((done / total) * 100)}%`;
  const laterHref = laterHrefFor(step, checklist);
  const kicker = solemn
    ? it.wizardKickerPrivacy
    : featured
      ? it.wizardKickerMedia
      : statusCopy(statusForWizardStep(step, checklist), false);
  const stepOf = it.wizardStepOf
    .replace("{current}", String(position + 1))
    .replace("{total}", String(steps.length));

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [step, reduceMotion]);

  return (
    <WizardContext.Provider value={{ step, steps, checklist, laterHref }}>
      <div className={styles.canvas}>
        <div className={styles.topbar}>
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
          <div className={styles.progress}>
            <span className={styles.progressText}>{progress}</span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.trackFill} style={{ width: fill }} />
            </span>
          </div>
          {previous ? (
            <Link href="/area" className={styles.exit} title={it.backToArea}>
              <Icon name="close" size={18} />
              <span className={styles.exitLabel}>{it.wizardExit}</span>
            </Link>
          ) : null}
        </div>

        <ol className={styles.steps} aria-label={progress}>
          {steps.map((id, index) => {
            const active = id === step;
            const status = statusForWizardStep(id, checklist);
            const statusLabel = statusCopy(status, active);
            return (
              <li
                key={id}
                className={styles.stepItem}
                data-done={status === "complete" || undefined}
                ref={active ? activeStepRef : undefined}
              >
                <Link
                  href={`/area/registrazione/${id}`}
                  className={`${styles.step} ${active ? styles.stepActive : ""}`}
                  aria-current={active ? "step" : undefined}
                  title={active ? undefined : WIZARD_STEP_LABELS[id]}
                >
                  <StepMark index={index} status={status} active={active} />
                  <span className={styles.stepLabel}>
                    {WIZARD_STEP_LABELS[id]}
                    <span className="srOnly">{` (${statusLabel})`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <section className={`${styles.stage} ${featured ? styles.featured : ""} ${solemn ? styles.solemn : ""}`}>
          <header className={styles.heading}>
            <span className={styles.headingIcon} aria-hidden="true">
              <Icon name={WIZARD_STEP_ICONS[step]} size={22} />
            </span>
            <div className={styles.headingText}>
              <p className={styles.kicker}>{`${stepOf} · ${kicker}`}</p>
              <h1 ref={headingRef} tabIndex={-1}>
                {WIZARD_STEP_LABELS[step]}
              </h1>
              <p className={styles.lead}>{WIZARD_STEP_LEADS[step]}</p>
            </div>
          </header>

          <Disclosure summary={it.wizardTipsTitle} icon="info" variant="inline" className={styles.tip}>
            <p>{WIZARD_STEP_TIPS[step]}</p>
          </Disclosure>

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
      </div>
    </WizardContext.Provider>
  );
}
