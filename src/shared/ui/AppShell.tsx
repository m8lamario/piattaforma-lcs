import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./AppShell.module.css";

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  children: ReactNode;
};

export function AppShell({ email, showTeam, showAdmin, children }: Props) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/area" className={styles.brand}>
          {it.appName}
        </Link>
        <nav className={styles.nav} aria-label="Principale">
          <Link href="/area">{it.navArea}</Link>
          {showTeam ? <Link href="/squadra">{it.navTeam}</Link> : null}
          {showAdmin ? <Link href="/admin/documenti">{it.navAdminDocuments}</Link> : null}
          <Link href="/area/comunicazioni">{it.navCommunications}</Link>
        </nav>
        <div className={styles.session}>
          {email ? <span className={styles.email}>{email}</span> : null}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost">
              {it.logout}
            </Button>
          </form>
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
