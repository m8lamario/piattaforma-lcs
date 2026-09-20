import type { ReactNode } from "react";
import { AdminSubnav } from "./AdminSubnav";
import { isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { countUnreadNotifications } from "@/features/notifications/data/notifications";
import { requireStaff } from "@/shared/authz/requireStaff";
import { legalFilesHavePlaceholders } from "@/shared/lib/legal";
import { AppShell } from "@/shared/ui/AppShell";
import { it } from "@/shared/i18n/it";
import styles from "./admin.module.css";

type Props = {
  path: string;
  children: ReactNode;
};

export async function AdminFrame({ path, children }: Props) {
  const { session, actor } = await requireStaff(path);
  const placeholders = await legalFilesHavePlaceholders();
  const unreadCount = await countUnreadNotifications(session.user!.id);

  return (
    <AppShell
      email={session.user?.email}
      showTeam={representativeTeamIds(actor).length > 0}
      showAdmin={isStaff(actor)}
      showPlayerTeam={actor.membershipTeamIds.length > 0}
      unreadCount={unreadCount}
    >
      <main className={styles.main}>
        {placeholders ? <p className={styles.banner}>{it.adminLegalBanner}</p> : null}
        <AdminSubnav pathname={path} />
        {children}
      </main>
    </AppShell>
  );
}
