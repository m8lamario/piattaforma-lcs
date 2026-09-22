import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/features/auth/ui/ResetPasswordForm";
import { findPasswordResetByToken } from "@/features/auth/data/passwordReset";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();
  const found = await findPasswordResetByToken(token);
  if (!found) notFound();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <p className={styles.kicker}>{it.brandOrg}</p>
          <h1>{it.resetPasswordTitle}</h1>
          <ResetPasswordForm token={token} />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
