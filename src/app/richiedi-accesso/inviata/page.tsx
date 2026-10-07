import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../page.module.css";

export default function SchoolAccessSentPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <p className={styles.kicker}>{it.landingSchoolKicker}</p>
          <h1>{it.schoolAccessSentTitle}</h1>
          <p className={styles.lead}>{it.schoolAccessSentLead}</p>
          <Link href="/" className={styles.back}>
            {it.backHome}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
