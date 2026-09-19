import Link from "next/link";
import { TokenEntryForm } from "@/features/teams/ui/TokenEntryForm";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./[token]/page.module.css";

export default function InviteEntryPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <p className={styles.kicker}>{it.landingBadge}</p>
          <h1>{it.inviteTitle}</h1>
          <TokenEntryForm />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
