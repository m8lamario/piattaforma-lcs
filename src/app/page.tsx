import Link from "next/link";
import { LandingHero } from "@/features/auth/ui/LandingHero";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span>{it.appName}</span>
        <Link href="/privacy">{it.privacy}</Link>
      </header>
      <main className={styles.main}>
        <LandingHero />
      </main>
    </div>
  );
}
