import { Suspense, type ReactNode } from "react";
import { it } from "@/shared/i18n/it";
import { AppNav } from "./AppNav";
import { BrandMark } from "./BrandMark";
import styles from "./AppShell.module.css";

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  showPlayerTeam?: boolean;
  showConsents?: boolean;
  showSchool?: boolean;
  unreadCount?: number;
  withdrawRegistrationId?: string | null;
  children: ReactNode;
};

export function AppShell({
  email,
  showTeam,
  showAdmin,
  showPlayerTeam,
  showConsents,
  showSchool,
  unreadCount,
  withdrawRegistrationId,
  children,
}: Props) {
  return (
    <div className={styles.shell}>
      <a href="#contenuto" className={styles.skip}>
        {it.skipToContent}
      </a>
      <header className={styles.header}>
        <BrandMark href="/area" compact />
        <Suspense>
          <AppNav
            email={email}
            showTeam={showTeam}
            showAdmin={showAdmin}
            showPlayerTeam={showPlayerTeam}
            showConsents={showConsents}
            showSchool={showSchool}
            unreadCount={unreadCount}
            withdrawRegistrationId={withdrawRegistrationId}
          />
        </Suspense>
      </header>
      <div id="contenuto" className={styles.content} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
