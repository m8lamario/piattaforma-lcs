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
        <div className={styles.stage} data-graphic-slot="" aria-hidden="true">
          <div className={styles.stageBack} />
          <div className={styles.stagePhoto}>
            <picture>
              <source media="(min-width: 960px)" srcSet="/IMG/horizontal.webp" />
              <img
                className={styles.stageImage}
                src="/IMG/vertical.webp"
                alt=""
                width={1565}
                height={2783}
                decoding="async"
              />
            </picture>
          </div>
          <span className={styles.stageRail} />
        </div>
        <div className={styles.heroInner}>
          <h1>
            <span>{it.brandShort}</span>{" "}
            <span className={styles.script}>{it.brandProduct.split(" ")[0]}</span>{" "}
            <span>{it.brandProduct.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className={styles.lead}>{it.tagline}</p>
          <p className={styles.copy}>{it.landingLead}</p>
          <div className={styles.actions}>
            <ButtonLink href="/accedi" className={styles.heroPrimary}>
              {it.ctaLogin}
            </ButtonLink>
            <ButtonLink href="/invito" variant="secondary" className={styles.heroSecondary}>
              {it.ctaInvite}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className={styles.how} aria-labelledby="come-funziona">
        <div className={styles.howInner}>
          <h2 id="come-funziona">{it.landingHowTitle}</h2>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.num} aria-hidden="true">
                  {step.n}
                </span>
                <div className={styles.stepBody}>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </motion.div>
  );
}
