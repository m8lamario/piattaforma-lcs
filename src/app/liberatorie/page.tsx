import Link from "next/link";
import { readLegalDocument } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import styles from "../privacy/page.module.css";

export default async function MediaReleasePage() {
  const body = await readLegalDocument("media-release");

  return (
    <main className={styles.main}>
      <article className={styles.article}>
        <h1>{it.stepLiberatorie}</h1>
        <p className={styles.notice}>{it.legalPlaceholderNotice}</p>
        <pre className={styles.body}>{body}</pre>
        <p>
          <Link href="/privacy">{it.privacy}</Link>
        </p>
        <Link href="/">{it.backHome}</Link>
      </article>
    </main>
  );
}
