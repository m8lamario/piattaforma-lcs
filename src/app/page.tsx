import { PublicShell } from "@/shared/ui/PublicShell";
import { LandingHero } from "@/features/auth/ui/LandingHero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <LandingHero />
      </main>
    </PublicShell>
  );
}
