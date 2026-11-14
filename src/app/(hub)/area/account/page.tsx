import { requirePageUser } from "@/shared/authz/requestIdentity";
import { AccountPasswordForm } from "@/features/auth/ui/AccountPasswordForm";
import { isTerminalRegistrationStatus } from "@/features/registrations/domain/requirements";
import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { prisma } from "@/shared/lib/prisma";
import { Avatar } from "@/shared/ui/Avatar";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
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
      <Panel title={it.accountAccessPanel} icon="user">
        <div className={styles.identity}>
          <Avatar name={identity.subjectEmail ?? it.accountTitle} />
          <div className={styles.identityText}>
            <span className={styles.identityLabel}>{it.emailReadOnly}</span>
            <strong className={styles.identityEmail}>{identity.subjectEmail}</strong>
          </div>
        </div>
      </Panel>
      <Panel title={it.accountPasswordPanel} icon="settings">
        {identity.view ? <p className={fields.banner}>{it.adminViewAccountLocked}</p> : <AccountPasswordForm />}
      </Panel>
      {!identity.view && withdrawRegistrationId ? (
        <Panel title={it.accountWithdrawPanel} icon="alert" tone="muted">
          <WithdrawForm registrationId={withdrawRegistrationId} />
        </Panel>
      ) : null}
    </main>
  );
}
