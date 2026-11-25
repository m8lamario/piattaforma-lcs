import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { HeroPhotoStage } from "./HeroPhotoStage";
import styles from "./LandingHero.module.css";

const STEPS = [
  { n: "01", title: it.landingHowInvite, copy: it.landingHowInviteCopy },
  { n: "02", title: it.landingHowAccount, copy: it.landingHowAccountCopy },
  { n: "03", title: it.landingHowPath, copy: it.landingHowPathCopy },
] as const;

export function LandingHero() {
  return (
    <div className={styles.stack}>
      <section className={styles.hero}>
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
    </div>
  );
}
