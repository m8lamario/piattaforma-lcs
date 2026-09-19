import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listNotifications, markNotificationsRead } from "@/features/notifications/data/notifications";
import { getActorByUserId, isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { AppShell } from "@/shared/ui/AppShell";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default async function CommunicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/comunicazioni");
  const actor = await getActorByUserId(session.user.id);
  const items = await listNotifications(session.user.id);
  await markNotificationsRead(session.user.id);

  return (
    <AppShell
      email={session.user.email}
      showTeam={actor ? representativeTeamIds(actor).length > 0 : false}
      showAdmin={actor ? isStaff(actor) : false}
    >
      <main className={styles.main}>
        {items.length === 0 ? (
          <EmptyState icon="inbox" title={it.navCommunications}>
            <p>{it.notificationsEmpty}</p>
            <p>{it.notificationsEmptyLead}</p>
          </EmptyState>
        ) : (
          <>
            <PageHeader title={it.navCommunications} />
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
