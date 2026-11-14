import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Panel.module.css";

type Tone = "default" | "accent" | "primary" | "warning" | "danger" | "muted";

type Props = {
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  tone?: Tone;
  flush?: boolean;
  id?: string;
  headingLevel?: 2 | 3;
  className?: string;
  children?: ReactNode;
};

const TONE: Record<Tone, string | undefined> = {
  default: undefined,
  accent: styles.accent,
  primary: styles.primary,
  warning: styles.warning,
  danger: styles.danger,
  muted: styles.muted,
};

export function Panel({
  title,
  description,
  icon,
  action,
  tone = "default",
  flush = false,
  id,
  headingLevel = 2,
  className,
  children,
}: Props) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      className={[styles.panel, TONE[tone], flush ? styles.flush : undefined, className].filter(Boolean).join(" ")}
      aria-labelledby={title ? headingId : undefined}
    >
      {title || action ? (
        <header className={styles.head}>
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              <Icon name={icon} size={18} />
            </span>
          ) : null}
          <div className={styles.headCopy}>
            {title ? (
              <Heading id={headingId} className={styles.title}>
                {title}
              </Heading>
            ) : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {action ? <div className={styles.action}>{action}</div> : null}
        </header>
      ) : null}
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  );
}
