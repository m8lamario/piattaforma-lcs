import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
};

export function PageHeader({ kicker, title, description, aside }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.lead}>{description}</p> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
