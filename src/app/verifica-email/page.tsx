import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEmailVerificationChallenge } from "@/features/auth/data/emailVerification";
import {
  emailVerificationPath,
  EMAIL_VERIFY_RESEND_SECONDS,
  maskEmailAddress,
  pathAfterEmailVerification,
} from "@/features/auth/domain/verify";
import { EmailCodeForm } from "@/features/auth/ui/EmailVerifyForm";
import { prisma } from "@/shared/lib/prisma";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../accedi/page.module.css";

type Props = { searchParams: Promise<{ next?: string }> };

function formatExpiry(value: Date) {
  return value.toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const destination = pathAfterEmailVerification(next);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=${encodeURIComponent(emailVerificationPath(destination))}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user) redirect("/accedi");
  if (user.emailVerified) redirect(destination);

  const challenge = await getEmailVerificationChallenge(user.email);

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <EmailCodeForm
            sentTo={maskEmailAddress(user.email)}
            nextPath={destination}
            active={challenge.active}
            expiresLabel={challenge.expiresAt ? it.emailVerifyExpires.replace("{when}", formatExpiry(challenge.expiresAt)) : null}
            resendAvailableAt={challenge.resendAvailableAt?.toISOString() ?? null}
            resendCooldownSeconds={EMAIL_VERIFY_RESEND_SECONDS}
          />
        </section>
      </main>
    </PublicShell>
  );
}
