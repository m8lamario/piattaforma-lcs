import Link from "next/link";
import { HeroPhotoStage } from "@/features/auth/ui/HeroPhotoStage";
import { SchoolAccessForm } from "@/features/school-access/ui/SchoolAccessForm";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "./SchoolLanding.module.css";

type EditionOption = { id: string; label: string };

type Props = {
  editions: EditionOption[];
};

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

export function SchoolLanding({ editions }: Props) {
  return (
    <main className={styles.main}>
      <div className={styles.stack}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <HeroPhotoStage
            styles={{
              stage: styles.stage,
              stageBack: styles.stageBack,
              stagePhoto: styles.stagePhoto,
              stageSlide: styles.stageSlide,
              stageImage: styles.stageImage,
              stageRail: styles.stageRail,
            }}
          />
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
              <SchoolAccessForm
                editions={editions}
                copy={{
                  requester: it.schoolAccessRequester,
                  firstName: it.firstName,
                  lastName: it.lastName,
                  email: it.email,
                  phone: it.phone,
                  school: it.adminSchool,
                  schoolName: it.schoolAccessSchoolName,
                  city: it.schoolAccessCity,
                  role: it.schoolAccessRole,
                  roleInstitute: it.schoolAccessRoleInstitute,
                  roleTeacher: it.schoolAccessRoleTeacher,
                  roleOther: it.schoolAccessRoleOther,
                  institutionalEmail: it.schoolAccessInstitutionalEmail,
                  competition: it.schoolAccessCompetition,
                  competitionPlaceholder: it.schoolAccessCompetitionPlaceholder,
                  submit: it.schoolAccessSubmit,
                  submitting: it.schoolAccessSubmitting,
                }}
              />
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
    </main>
  );
}
