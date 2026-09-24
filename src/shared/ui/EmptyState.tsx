import type { ReactNode } from "react";
import { FieldMark } from "./FieldMark";
import { Icon, type IconName } from "./Icon";
import styles from "./EmptyState.module.css";

type Props = {
  icon?: IconName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ icon, title, children, action }: Props) {
  return (
    <section className={styles.wrap}>
      <FieldMark variant="corner" />
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.body}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
