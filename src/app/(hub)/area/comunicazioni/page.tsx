import { requirePageUser } from "@/shared/authz/requestIdentity";
import { after } from "next/server";
import { listNotifications, markNotificationsRead } from "@/features/notifications/data/notifications";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/Icon";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

const dateFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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
          <PageHeader title={it.navCommunications} description={it.notificationsLead} />
          <Panel
            flush
            action={
              <StatusChip tone="neutral">
                {it.notificationsCount.replace("{count}", String(items.length))}
              </StatusChip>
            }
          >
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id} className={`${styles.item} ${item.readAt ? "" : styles.unread}`}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon name={item.readAt ? "inbox" : "bell"} size={18} />
                  </span>
                  <div className={styles.copy}>
                    <div className={styles.head}>
                      <strong>{item.title}</strong>
                      {item.readAt ? null : <StatusChip tone="todo">{it.notificationsUnread}</StatusChip>}
                    </div>
                    <p>{item.body}</p>
                    <time className={styles.time} dateTime={item.createdAt.toISOString()}>
                      {dateFormat.format(item.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </main>
  );
}
