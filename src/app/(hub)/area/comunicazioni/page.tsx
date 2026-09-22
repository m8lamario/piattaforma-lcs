import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listNotifications, markNotificationsRead } from "@/features/notifications/data/notifications";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default async function CommunicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/comunicazioni");
  const items = await listNotifications(session.user.id);
  await markNotificationsRead(session.user.id);

  return (
    <main className={styles.main}>
      {items.length === 0 ? (
        <EmptyState icon="inbox" title={it.navCommunications}>
          <p>{it.notificationsEmpty}</p>
          <p>{it.notificationsEmptyLead}</p>
        </EmptyState>
      ) : (
        <>
          <PageHeader title={it.navCommunications} description={it.guardianEmailNote} />
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
  );
}
