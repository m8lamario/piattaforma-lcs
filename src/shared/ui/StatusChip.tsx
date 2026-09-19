import type { ReactNode } from "react";
import styles from "./StatusChip.module.css";

export type StatusTone = "complete" | "todo" | "attention" | "success" | "danger" | "neutral";

const TONE: Record<StatusTone, string> = {
  complete: styles.complete,
  todo: styles.todo,
  attention: styles.attention,
  success: styles.success,
  danger: styles.danger,
  neutral: styles.neutral,
};

type Props = {
  tone: StatusTone;
  children: ReactNode;
};

export function StatusChip({ tone, children }: Props) {
  return (
    <span className={`${styles.chip} ${TONE[tone]}`}>
      <span className={styles.mark} aria-hidden="true" />
      {children}
    </span>
  );
}
