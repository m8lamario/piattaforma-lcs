import Link from "next/link";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./page.module.css";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/area";

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <p className={styles.kicker}>{it.brandOrg}</p>
          <h1>{it.loginTitle}</h1>
          <p className={styles.lead}>{it.loginSubtitle}</p>
          <LoginForm nextPath={nextPath} />
          <Link href="/" className={styles.back}>
            {it.backHome}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
