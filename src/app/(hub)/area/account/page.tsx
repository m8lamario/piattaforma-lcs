import { requirePageUser } from "@/shared/authz/requestIdentity";
import { AccountPasswordForm } from "@/features/auth/ui/AccountPasswordForm";
import { isTerminalRegistrationStatus } from "@/features/registrations/domain/requirements";
import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { prisma } from "@/shared/lib/prisma";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./page.module.css";

export default async function AccountPage() {
  const identity = await requirePageUser("/area/account");

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: identity.subjectUserId },
    select: {
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });
  const registration = profile?.registrations[0];
  const withdrawRegistrationId =
    registration && !isTerminalRegistrationStatus(registration.status) ? registration.id : null;

  return (
    <main className={styles.main}>
      <PageHeader title={it.accountTitle} />
      <p className={fields.readonly}>
        {it.emailReadOnly}: <strong>{identity.subjectEmail}</strong>
      </p>
      {identity.view ? <p className={fields.banner}>{it.adminViewAccountLocked}</p> : <AccountPasswordForm />}
      {!identity.view && withdrawRegistrationId ? (
        <section className={styles.option} aria-labelledby="account-withdraw-title">
          <h2 id="account-withdraw-title" className={styles.optionTitle}>
            {it.withdraw}
          </h2>
          <WithdrawForm registrationId={withdrawRegistrationId} />
        </section>
      ) : null}
    </main>
  );
}
