import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ResendEmailVerificationForm } from "@/features/auth/ui/EmailVerifyForm";
import { prisma } from "@/shared/lib/prisma";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../accedi/page.module.css";

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/verifica-email");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (user?.emailVerified) redirect("/area");

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <ResendEmailVerificationForm />
        </section>
      </main>
    </PublicShell>
  );
}
