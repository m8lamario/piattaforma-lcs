import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Disclosure.module.css";

type Props = {
  summary: ReactNode;
  icon?: IconName;
  defaultOpen?: boolean;
  variant?: "inline" | "boxed";
  className?: string;
  children: ReactNode;
};

export function Disclosure({ summary, icon, defaultOpen = false, variant = "boxed", className, children }: Props) {
  return (
    <details
      className={[styles.details, variant === "inline" ? styles.inline : styles.boxed, className].filter(Boolean).join(" ")}
      open={defaultOpen || undefined}
    >
      <summary className={styles.summary}>
        {icon ? <Icon name={icon} size={18} className={styles.icon} /> : null}
        <span className={styles.label}>{summary}</span>
        <Icon name="chevronDown" size={18} className={styles.chevron} />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
