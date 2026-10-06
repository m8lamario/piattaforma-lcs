import { notFound } from "next/navigation";
import { VerifyEmailTokenForm } from "@/features/auth/ui/EmailVerifyForm";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function VerifyEmailTokenPage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <VerifyEmailTokenForm token={token} />
        </section>
      </main>
    </PublicShell>
  );
}
