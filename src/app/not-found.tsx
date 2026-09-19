import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./privacy/page.module.css";

export default function NotFound() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <article className={styles.article}>
          <h1>{it.notFoundTitle}</h1>
          <p>{it.notFoundBody}</p>
          <ButtonLink href="/" variant="ghost">
            {it.backHome}
          </ButtonLink>
        </article>
      </main>
    </PublicShell>
  );
}
