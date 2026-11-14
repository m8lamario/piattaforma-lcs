import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ kicker, title, description, aside, actions }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.lead}>{description}</p> : null}
      </div>
      {aside || actions ? (
        <div className={styles.aside}>
          {aside}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
