import Image from "next/image";
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
        <div className={styles.container}>
          <section className={styles.brandPanel}>
            <Image
              src="/logoLCSw.png"
              alt=""
              width={393}
              height={524}
              className={styles.panelLogo}
            />
            <p className={styles.kicker}>{it.brandOrg}</p>
            <h2>{it.appName}</h2>
            <p className={styles.brandLead}>{it.tagline}</p>
            <div className={styles.brandPoints}>
              <div className={styles.point}>
                <strong>{it.landingHowInvite}</strong>
                <p>{it.landingHowInviteCopy}</p>
              </div>
              <div className={styles.point}>
                <strong>{it.landingHowAccount}</strong>
                <p>{it.landingHowAccountCopy}</p>
              </div>
            </div>
          </section>

          <section className={styles.auth}>
            <p className={styles.kicker}>{it.brandProduct}</p>
            <h1>{it.loginTitle}</h1>
            <p className={styles.lead}>{it.loginSubtitle}</p>
            <LoginForm nextPath={nextPath} />
            <Link href="/" className={styles.back}>
              {it.backHome}
            </Link>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
