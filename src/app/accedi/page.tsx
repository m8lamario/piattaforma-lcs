import Link from "next/link";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/area";

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <h1>{it.loginTitle}</h1>
        <p>{it.loginSubtitle}</p>
        <LoginForm nextPath={nextPath} />
        <Link href="/">{it.backHome}</Link>
      </section>
    </main>
  );
}
