import type { ReactNode } from "react";
import styles from "./league.module.css";

export function LeagueFrame({ children }: { children: ReactNode }) {
  return <main className={styles.main}>{children}</main>;
}
