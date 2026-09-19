import Link from "next/link";
import { readLegalDocument } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default async function PrivacyPage() {
  const body = await readLegalDocument("privacy-policy");

  return (
    <main className={styles.main}>
      <article className={styles.article}>
        <p className={styles.notice}>{it.legalPlaceholderNotice}</p>
        <pre className={styles.body}>{body}</pre>
        <Link href="/">{it.backHome}</Link>
      </article>
    </main>
  );
}
