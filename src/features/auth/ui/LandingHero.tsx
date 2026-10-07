"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { HERO_PHOTO_INTERVAL_MS, HERO_PHOTOS } from "./heroPhotos";
import styles from "./LandingHero.module.css";

const STEPS = [
  { n: "01", title: it.landingHowInvite, copy: it.landingHowInviteCopy },
  { n: "02", title: it.landingHowAccount, copy: it.landingHowAccountCopy },
  { n: "03", title: it.landingHowPath, copy: it.landingHowPathCopy },
] as const;

function HeroStage() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const canRotate = !reduceMotion && HERO_PHOTOS.length > 1;

  useEffect(() => {
    if (!canRotate) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_PHOTOS.length);
    }, HERO_PHOTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canRotate]);

  const slide = HERO_PHOTOS[index] ?? HERO_PHOTOS[0];

  return (
    <div className={styles.stage} data-graphic-slot="" aria-hidden="true">
      <div className={styles.stageBack} />
      <div className={styles.stagePhoto}>
        <AnimatePresence initial={false}>
          <motion.div
            key={`${slide.desktop}:${slide.mobile}`}
            className={styles.stageSlide}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <picture>
              <source media="(min-width: 960px)" srcSet={slide.desktop} />
              <img
                className={styles.stageImage}
                src={slide.mobile}
                alt=""
                width={1565}
                height={2783}
                decoding="async"
                style={
                  {
                    "--photo-pos-desktop": slide.objectPositionDesktop,
                    "--photo-pos-mobile": slide.objectPositionMobile,
                  } as CSSProperties
                }
              />
            </picture>
          </motion.div>
        </AnimatePresence>
      </div>
      <span className={styles.stageRail} />
    </div>
  );
}

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
        <HeroStage />
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

      <section className={styles.schools} aria-labelledby="scuole">
        <div className={styles.schoolsInner}>
          <p className={styles.schoolsKicker}>{it.landingSchoolKicker}</p>
          <h2 id="scuole">{it.landingSchoolTitle}</h2>
          <p className={styles.schoolsCopy}>{it.landingSchoolCopy}</p>
          <ButtonLink href="/richiedi-accesso" variant="secondary">
            {it.landingSchoolCta}
          </ButtonLink>
        </div>
      </section>
    </motion.div>
  );
}
