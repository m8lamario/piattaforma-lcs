import { auth } from "@/auth";
import { findStaffInviteByPlainToken } from "@/features/admin/data/staffInvites";
import { StaffRedeemForm } from "@/features/admin/ui/StaffRedeemForm";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { prisma } from "@/shared/lib/prisma";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "@/app/invito/[token]/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function StaffInvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!isWellFormedInviteToken(token)) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.adminStaffInvite}</h1>
            <p>{it.inviteInvalid}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const found = await findStaffInviteByPlainToken(token);
  const outcome = found?.inspection.outcome ?? "invalid";
  if (outcome !== "redeemable" || !found) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.adminStaffInvite}</h1>
            <p>{outcome === "expired" ? it.inviteExpired : it.inviteInvalid}</p>
          </section>
        </main>
      </PublicShell>
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: found.invite.email } });
  const needsPassword = !existing;
  const needsLogin = Boolean(existing && (!session?.user?.id || session.user.email?.toLowerCase() !== found.invite.email));

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <h1>{it.adminStaffInvite}</h1>
          <p>
            {it.inviteRedeemLead.replace("{team}", found.invite.team.name).replace("{email}", found.invite.email)}
          </p>
          {needsLogin ? <LoginForm nextPath={`/invito-staff/${token}`} /> : <StaffRedeemForm token={token} needsPassword={needsPassword} />}
        </section>
      </main>
    </PublicShell>
  );
}
