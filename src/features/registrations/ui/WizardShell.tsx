"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { WizardStepId } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
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

type Props = {
  step: WizardStepId;
  steps: WizardStepId[];
  children: ReactNode;
};

export function WizardShell({ step, steps, children }: Props) {
  const current = Math.max(1, steps.indexOf(step) + 1);
  const progress = it.wizardProgress
    .replace("{current}", String(current))
    .replace("{total}", String(steps.length));

  return (
    <section className={styles.wrap}>
      <p className={styles.progress}>{progress}</p>
      <ol className={styles.dots} aria-hidden="true">
        {steps.map((id) => (
          <li key={id} className={id === step ? styles.dotActive : styles.dot} />
        ))}
      </ol>
      <h1>{LABELS[step]}</h1>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        {children}
      </motion.div>
    </section>
  );
}
