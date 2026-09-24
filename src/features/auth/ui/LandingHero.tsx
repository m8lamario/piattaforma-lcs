"use client";

import { motion, useReducedMotion } from "framer-motion";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import styles from "./LandingHero.module.css";

const STEPS = [
  { n: "01", title: it.landingHowInvite, copy: it.landingHowInviteCopy },
  { n: "02", title: it.landingHowAccount, copy: it.landingHowAccountCopy },
  { n: "03", title: it.landingHowPath, copy: it.landingHowPathCopy },
] as const;

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={styles.stack}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
    >
      <section className={styles.hero}>
        <p className={styles.badge}>{it.landingBadge}</p>
        <p className={styles.org}>{it.orgLine}</p>
        <h1>
          <span>{it.brandShort}</span>{" "}
          <span className={styles.script}>{it.brandProduct.split(" ")[0]}</span>{" "}
          <span>{it.brandProduct.split(" ").slice(1).join(" ")}</span>
        </h1>
        <p className={styles.lead}>{it.tagline}</p>
        <p className={styles.copy}>{it.landingLead}</p>
        <div className={styles.actions}>
          <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          <ButtonLink href="/invito" variant="ghost">
            {it.ctaInvite}
          </ButtonLink>
        </div>
      </section>

      <section className={styles.how} aria-labelledby="come-funziona">
        <h2 id="come-funziona">{it.landingHowTitle}</h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.num} aria-hidden="true">
                {step.n}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </motion.div>
  );
}
