import { requirePageUser } from "@/shared/authz/requestIdentity";
import { after } from "next/server";
import { listNotifications, markNotificationsRead } from "@/features/notifications/data/notifications";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

export default async function CommunicationsPage() {
  const identity = await requirePageUser("/area/comunicazioni");
  const items = await listNotifications(identity.subjectUserId);
  if (!identity.view) {
    after(() => markNotificationsRead(identity.subjectUserId));
  }

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
