import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./NextStepHero.module.css";

type Props = {
  kicker: string;
  icon?: IconName;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  tone?: "default" | "done" | "warning";
};

export function NextStepHero({ kicker, icon = "zap", title, lead, actions, aside, tone = "default" }: Props) {
  return (
    <section className={styles.hero} data-tone={tone === "default" ? undefined : tone} aria-labelledby="next-step-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>
          <Icon name={icon} size={16} />
          {kicker}
        </p>
        <h2 id="next-step-title" className={styles.title}>
          {title}
        </h2>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </section>
  );
}
