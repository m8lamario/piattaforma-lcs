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

  return (
    <section className={`${styles.wrap} ${featured ? styles.featured : ""} ${solemn ? styles.solemn : ""}`}>
      <p className={styles.progress}>
        <span className="srOnly">{progress}</span>
        <span aria-hidden="true">
          {current}
          <span className={styles.of}>/{steps.length}</span>
        </span>
      </p>

      <ol className={styles.steps} aria-label={it.wizardProgress.replace("{current}", String(current)).replace("{total}", String(steps.length))}>
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

      {previous ? (
        <Link href={`/area/registrazione/${previous}`} className={styles.back}>
          <Icon name="back" size={16} />
          {it.wizardBack}: {LABELS[previous]}
        </Link>
      ) : null}

      <header className={styles.heading}>
        <span className={styles.headingIcon} aria-hidden="true">
          <Icon name={STEP_ICONS[step]} size={20} />
        </span>
        <div>
          <h1>{LABELS[step]}</h1>
          <p className={styles.lead}>{LEADS[step]}</p>
        </div>
      </header>

      <motion.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24 }}
      >
        {children}
      </motion.div>
    </section>
  );
}
