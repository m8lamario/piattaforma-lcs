import { PublicShell } from "@/shared/ui/PublicShell";
import { HeroPhotoPreload } from "@/features/auth/ui/HeroPhotoPreload";
import { LandingHero } from "@/features/auth/ui/LandingHero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <PublicShell>
      <HeroPhotoPreload />
      <main className={styles.main}>
        <LandingHero />
      </main>
    </PublicShell>
  );
}
