"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { HERO_PHOTO_INTERVAL_MS, HERO_PHOTOS } from "@/features/auth/ui/heroPhotos";
import { SchoolAccessForm } from "@/features/school-access/ui/SchoolAccessForm";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "./SchoolLanding.module.css";

type EditionOption = { id: string; label: string };

type Props = {
  editions: EditionOption[];
};

function SchoolHeroStage() {
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

export function SchoolLanding({ editions }: Props) {
  const reduceMotion = useReducedMotion();

  const OVERVIEW_CARDS: {
    icon: IconName;
    title: string;
    copy: string;
  }[] = [
    {
      icon: "trophy",
      title: it.schoolLandingOverview1Title,
      copy: it.schoolLandingOverview1Copy,
    },
    {
      icon: "stopwatch",
      title: it.schoolLandingOverview2Title,
      copy: it.schoolLandingOverview2Copy,
    },
    {
      icon: "camera",
      title: it.schoolLandingOverview3Title,
      copy: it.schoolLandingOverview3Copy,
    },
    {
      icon: "fileCheck",
      title: it.schoolLandingOverview4Title,
      copy: it.schoolLandingOverview4Copy,
    },
  ];

  const STEPS = [
    {
      n: it.schoolLandingStep1Num,
      title: it.schoolLandingStep1Title,
      copy: it.schoolLandingStep1Copy,
    },
    {
      n: it.schoolLandingStep2Num,
      title: it.schoolLandingStep2Title,
      copy: it.schoolLandingStep2Copy,
    },
    {
      n: it.schoolLandingStep3Num,
      title: it.schoolLandingStep3Title,
      copy: it.schoolLandingStep3Copy,
    },
    {
      n: it.schoolLandingStep4Num,
      title: it.schoolLandingStep4Title,
      copy: it.schoolLandingStep4Copy,
    },
  ] as const;

  const BENEFITS = [
    {
      tag: "Capitani & Studenti",
      title: it.schoolLandingBenefitRepsTitle,
      copy: it.schoolLandingBenefitRepsCopy,
    },
    {
      tag: "Docenti & Istituto",
      title: it.schoolLandingBenefitSchoolTitle,
      copy: it.schoolLandingBenefitSchoolCopy,
    },
    {
      tag: "Squadra & Famiglie",
      title: it.schoolLandingBenefitPlayersTitle,
      copy: it.schoolLandingBenefitPlayersCopy,
    },
  ] as const;

  const FAQS = [
    {
      q: it.schoolLandingFaq1Q,
      a: it.schoolLandingFaq1A,
    },
    {
      q: it.schoolLandingFaq2Q,
      a: it.schoolLandingFaq2A,
    },
    {
      q: it.schoolLandingFaq3Q,
      a: it.schoolLandingFaq3A,
    },
    {
      q: it.schoolLandingFaq4Q,
      a: it.schoolLandingFaq4A,
    },
  ] as const;

  return (
    <motion.main
      className={styles.main}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
    >
      <div className={styles.stack}>
        {/* HERO SECTION */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <SchoolHeroStage />
          <div className={styles.heroInner}>
            <span className={styles.badge}>{it.schoolLandingBadge}</span>
            <h1 id="hero-title">
              <span>{it.schoolLandingTitleMain}</span>{" "}
              <span className={styles.script}>{it.schoolLandingTitleScript}</span>{" "}
              <span>{it.schoolLandingTitleSuffix}</span>
            </h1>
            <p className={styles.lead}>{it.schoolLandingTagline}</p>
            <p className={styles.copy}>{it.schoolLandingLead}</p>
            <div className={styles.actions}>
              <ButtonLink href="#candidatura" className={styles.heroPrimary}>
                {it.schoolLandingCtaForm}
              </ButtonLink>
              <ButtonLink href="#come-funziona" variant="secondary" className={styles.heroSecondary}>
                {it.schoolLandingCtaHow}
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* TOURNAMENT OVERVIEW STRIP */}
        <section className={styles.overview} aria-labelledby="overview-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>{it.schoolLandingOverviewKicker}</p>
              <h2 id="overview-title" className={styles.sectionTitle}>
                {it.schoolLandingOverviewTitle}
              </h2>
            </div>
            <div className={styles.overviewGrid}>
              {OVERVIEW_CARDS.map((card) => (
                <article key={card.title} className={styles.overviewCard}>
                  <div className={styles.overviewCardHeader}>
                    <span className={styles.overviewCardIcon} aria-hidden="true">
                      <Icon name={card.icon} size={20} />
                    </span>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS (4 STEPS) */}
        <section className={styles.stepsSection} id="come-funziona" aria-labelledby="steps-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>{it.schoolLandingStepsKicker}</p>
              <h2 id="steps-title" className={styles.sectionTitle}>
                {it.schoolLandingStepsTitle}
              </h2>
            </div>
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

        {/* BENEFITS SECTION */}
        <section className={styles.benefitsSection} aria-labelledby="benefits-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>{it.schoolLandingBenefitsKicker}</p>
              <h2 id="benefits-title" className={styles.sectionTitle}>
                {it.schoolLandingBenefitsTitle}
              </h2>
            </div>
            <div className={styles.benefitsGrid}>
              {BENEFITS.map((benefit) => (
                <article key={benefit.title} className={styles.benefitCard}>
                  <span className={styles.benefitTag}>{benefit.tag}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FORM SECTION (CANDIDATURA) */}
        <section className={styles.formSection} id="candidatura" aria-labelledby="form-title">
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <p className={styles.kicker}>{it.schoolLandingFormKicker}</p>
              <h2 id="form-title">{it.schoolLandingFormTitle}</h2>
              <p className={styles.formLead}>{it.schoolLandingFormLead}</p>
            </div>

            {editions.length === 0 ? (
              <p className={styles.formLead}>{it.schoolAccessNoEditions}</p>
            ) : (
              <SchoolAccessForm editions={editions} />
            )}

            <p className={styles.formNote}>{it.schoolLandingFormNote}</p>

            <div className={styles.formExisting}>
              <div>
                <span>{it.schoolLandingAlreadyAccount} </span>
                <Link href="/accedi" className={styles.loginLink}>
                  {it.schoolLandingLoginLink}
                </Link>
              </div>
              <Link href="/" className={styles.backHomeLink}>
                <Icon name="back" size={16} />
                <span>{it.schoolLandingBackHome}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>{it.schoolLandingFaqKicker}</p>
              <h2 id="faq-title" className={styles.sectionTitle}>
                {it.schoolLandingFaqTitle}
              </h2>
            </div>
            <div className={styles.faqGrid}>
              {FAQS.map((faq) => (
                <article key={faq.q} className={styles.faqItem}>
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </motion.main>
  );
}
