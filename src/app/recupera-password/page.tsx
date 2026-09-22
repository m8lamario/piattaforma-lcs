import Link from "next/link";
import { RequestResetForm } from "@/features/auth/ui/RequestResetForm";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../accedi/page.module.css";

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <p className={styles.kicker}>{it.brandOrg}</p>
          <h1>{it.forgotPassword}</h1>
          <p className={styles.lead}>{it.forgotPasswordHelp}</p>
          <RequestResetForm />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
