import type { ReactNode } from "react";
import Image from "next/image";
import { it } from "@/shared/i18n/it";
import { AppNav } from "./AppNav";
import { BrandMark } from "./BrandMark";
import styles from "./AppShell.module.css";

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  showPlayerTeam?: boolean;
  unreadCount?: number;
  children: ReactNode;
};

export function AppShell({ email, showTeam, showAdmin, showPlayerTeam, unreadCount, children }: Props) {
  return (
    <div className={styles.shell}>
      <a href="#contenuto" className={styles.skip}>
        {it.skipToContent}
      </a>
      <header className={styles.header}>
        <BrandMark href="/area" compact />
        <AppNav
          email={email}
          showTeam={showTeam}
          showAdmin={showAdmin}
          showPlayerTeam={showPlayerTeam}
          unreadCount={unreadCount}
        />
      </header>
      <div id="contenuto" className={styles.content} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
