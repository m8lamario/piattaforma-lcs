import Link from "next/link";
import { TokenEntryForm } from "@/features/teams/ui/TokenEntryForm";
import { it } from "@/shared/i18n/it";
import styles from "./[token]/page.module.css";

export default function InviteEntryPage() {
  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <h1>{it.inviteTitle}</h1>
        <TokenEntryForm />
        <Link href="/accedi">{it.ctaLogin}</Link>
      </section>
    </main>
  );
}
