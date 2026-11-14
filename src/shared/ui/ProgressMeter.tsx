import type { StatusTone } from "./StatusChip";
import styles from "./ProgressMeter.module.css";

type Props = {
  done: number;
  total: number;
  label: string;
  caption?: string;
  segments?: StatusTone[];
  size?: "md" | "lg";
  inverse?: boolean;
};

const SEGMENT: Partial<Record<StatusTone, string>> = {
  complete: styles.segDone,
  success: styles.segDone,
  attention: styles.segAttention,
  danger: styles.segDanger,
};

export function ProgressMeter({ done, total, label, caption, segments, size = "md", inverse = false }: Props) {
  const ratio = total === 0 ? 0 : Math.min(1, done / total);
  return (
    <div className={[styles.meter, size === "lg" ? styles.large : undefined, inverse ? styles.inverse : undefined].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <span className={styles.count} aria-hidden="true">
          {done}
          <span className={styles.total}>/{total}</span>
        </span>
        {caption ? <span className={styles.caption}>{caption}</span> : null}
      </div>
      {segments && segments.length > 0 ? (
        <div className={styles.segments} role="img" aria-label={label}>
          {segments.map((tone, index) => (
            <span key={index} className={`${styles.segment} ${SEGMENT[tone] ?? ""}`} />
          ))}
        </div>
      ) : (
        <div
          className={styles.track}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <span className={styles.fill} style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
