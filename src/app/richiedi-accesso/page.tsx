import Link from "next/link";
import { listActiveEditionsForAccess } from "@/features/school-access/data/requests";
import { SchoolAccessForm } from "@/features/school-access/ui/SchoolAccessForm";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./page.module.css";

export default async function SchoolAccessPage() {
  const editions = await listActiveEditionsForAccess();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <p className={styles.kicker}>{it.landingSchoolKicker}</p>
          <h1>{it.schoolAccessTitle}</h1>
          <p className={styles.lead}>{it.schoolAccessLead}</p>
          {editions.length === 0 ? (
            <p className={styles.lead}>{it.schoolAccessNoEditions}</p>
          ) : (
            <SchoolAccessForm
              editions={editions.map((edition) => ({
                id: edition.id,
                label: `${edition.competition.name} · ${edition.name} (${edition.year})`,
              }))}
            />
          )}
          <Link href="/" className={styles.back}>
            {it.backHome}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
