import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { StatusChip, type StatusTone } from "./StatusChip";
import styles from "./TaskList.module.css";

export type TaskItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  href?: string;
  icon?: IconName;
  index?: number;
  tone: StatusTone;
  status?: ReactNode;
  action?: ReactNode;
};

const LEAD_TONE: Partial<Record<StatusTone, string>> = {
  complete: styles.leadDone,
  success: styles.leadDone,
  attention: styles.leadAttention,
  danger: styles.leadDanger,
};

function Lead({ item }: { item: TaskItem }) {
  const done = item.tone === "complete" || item.tone === "success";
  const glyph = done ? (
    <Icon name="check" size={16} />
  ) : item.icon ? (
    <Icon name={item.icon} size={18} />
  ) : item.index !== undefined ? (
    item.index
  ) : (
    <Icon name="chevronRight" size={16} />
  );
  return (
    <span className={`${styles.lead} ${LEAD_TONE[item.tone] ?? ""}`} aria-hidden="true">
      {glyph}
    </span>
  );
}

function RowBody({ item }: { item: TaskItem }) {
  return (
    <>
      <Lead item={item} />
      <span className={styles.copy}>
        <span className={styles.title}>{item.title}</span>
        {item.meta ? <span className={styles.meta}>{item.meta}</span> : null}
      </span>
      {item.status ? (
        <span className={styles.status}>
          <StatusChip tone={item.tone}>{item.status}</StatusChip>
        </span>
      ) : null}
      {item.href && !item.action ? <Icon name="chevronRight" size={18} className={styles.chevron} /> : null}
    </>
  );
}

type Props = {
  items: TaskItem[];
  ordered?: boolean;
  empty?: ReactNode;
  className?: string;
};

export function TaskList({ items, ordered = false, empty, className }: Props) {
  if (items.length === 0) {
    return empty ? <div className={styles.empty}>{empty}</div> : null;
  }
  const List = ordered ? "ol" : "ul";
  return (
    <List className={[styles.list, className].filter(Boolean).join(" ")}>
      {items.map((item) => {
        const flagged = item.tone === "attention" || item.tone === "danger";
        const row = item.href ? (
          <Link href={item.href} className={`${styles.row} ${styles.link} ${flagged ? styles.flag : ""}`}>
            <RowBody item={item} />
          </Link>
        ) : (
          <div className={`${styles.row} ${flagged ? styles.flag : ""}`}>
            <RowBody item={item} />
          </div>
        );
        return (
          <li key={item.id}>
            {item.action ? (
              <div className={styles.withAction}>
                {row}
                <div className={styles.action}>{item.action}</div>
              </div>
            ) : (
              row
            )}
          </li>
        );
      })}
    </List>
  );
}
