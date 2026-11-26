import type { ReactNode } from "react";
import { it } from "@/shared/i18n/it";
import { AppNav } from "./AppNav";
import { homeForShellFlags } from "./shellNav";
import styles from "./AppShell.module.css";

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  showPlayerTeam?: boolean;
  showConsents?: boolean;
  showSchool?: boolean;
  showMedia?: boolean;
  mediaUnderAdmin?: boolean;
  showArea?: boolean;
  showLeague?: boolean;
  unreadCount?: number;
  children: ReactNode;
};

export function AppShell({
  email,
  showTeam,
  showAdmin,
  showPlayerTeam,
  showConsents,
  showSchool,
  showMedia,
  mediaUnderAdmin = false,
  showArea = true,
  showLeague = false,
  unreadCount,
  children,
}: Props) {
  return (
    <div className={styles.shell}>
      <a href="#contenuto" className={styles.skip}>
        {it.skipToContent}
      </a>
      <AppNav
        copy={{
          navOverview: it.navOverview,
          navLeagueSchools: it.navLeagueSchools,
          navLeaguePlayers: it.navLeaguePlayers,
          navMedia: it.navMedia,
          navMediaShort: it.navMediaShort,
          navArea: it.navArea,
          navAreaShort: it.navAreaShort,
          navRoster: it.navRoster,
          navInvites: it.navInvites,
          navPlayerTeam: it.navPlayerTeam,
          navAdmin: it.navAdmin,
          navAdminShort: it.navAdminShort,
          navCommunications: it.navCommunications,
          navCommunicationsShort: it.navCommunicationsShort,
          navSchool: it.navSchool,
          navConsents: it.navConsents,
          navAccount: it.navAccount,
          unreadBadge: it.unreadBadge,
          navSignedInAs: it.navSignedInAs,
          logout: it.logout,
          navMenu: it.navMenu,
          navPrimary: it.navPrimary,
          navTabs: it.navTabs,
          navClose: it.navClose,
        }}
        brandHref={homeForShellFlags({
          showMedia: Boolean(showMedia),
          showArea,
          showAdmin: Boolean(showAdmin),
          mediaUnderAdmin,
          showLeague,
        })}
        email={email}
        showTeam={showTeam}
        showAdmin={showAdmin}
        showPlayerTeam={showPlayerTeam}
        showConsents={showConsents}
        showSchool={showSchool}
        showMedia={showMedia}
        mediaUnderAdmin={mediaUnderAdmin}
        showArea={showArea}
        showLeague={showLeague}
        unreadCount={unreadCount}
      />
      <div id="contenuto" className={styles.content} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
