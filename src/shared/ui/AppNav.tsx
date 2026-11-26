"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import { Avatar } from "./Avatar";
import { BrandMark } from "./BrandMark";
import { Icon, type IconName } from "./Icon";
import styles from "./AppShell.module.css";

export type AppNavCopy = {
  navOverview: string;
  navLeagueSchools: string;
  navLeaguePlayers: string;
  navMedia: string;
  navMediaShort: string;
  navArea: string;
  navAreaShort: string;
  navRoster: string;
  navInvites: string;
  navPlayerTeam: string;
  navAdmin: string;
  navAdminShort: string;
  navCommunications: string;
  navCommunicationsShort: string;
  navSchool: string;
  navConsents: string;
  navAccount: string;
  unreadBadge: string;
  navSignedInAs: string;
  logout: string;
  navMenu: string;
  navPrimary: string;
  navTabs: string;
  navClose: string;
};

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: IconName;
  badge?: number;
  children?: { href: string; label: string }[];
};

type Props = {
  copy: AppNavCopy;
  brandHref: string;
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
};

const TAB_LIMIT = 5;
const FOCUS_PREFIXES = ["/area/registrazione", "/area/dati"];

function NavLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      {...({ unstable_dynamicOnHover: true } as unknown as ComponentProps<typeof Link>)}
    />
  );
}

function isActive(href: string, pathname: string) {
  if (href === "/area") {
    return (
      pathname === "/area" ||
      pathname.startsWith("/area/registrazione") ||
      pathname.startsWith("/area/dati") ||
      pathname.startsWith("/area/pagamento")
    );
  }
  if (href === "/squadra") return pathname === "/squadra";
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/lega") return pathname === "/lega";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemActive(item: NavItem, pathname: string) {
  if (isActive(item.href, pathname)) return true;
  return Boolean(item.children?.some((child) => isActive(child.href, pathname)));
}

function buildItems({
  copy,
  showTeam,
  showAdmin,
  showPlayerTeam,
  showConsents,
  showSchool,
  showMedia,
  mediaUnderAdmin,
  showArea,
  showLeague,
  unreadCount,
}: Omit<Props, "brandHref" | "email">): NavItem[] {
  if (showLeague) {
    return [
      { href: "/lega", label: copy.navOverview, short: copy.navOverview, icon: "area" },
      { href: "/lega/scuole", label: copy.navLeagueSchools, short: copy.navLeagueSchools, icon: "org" },
      { href: "/lega/giocatori", label: copy.navLeaguePlayers, short: copy.navLeaguePlayers, icon: "users" },
    ];
  }
  return [
    ...(showMedia && !mediaUnderAdmin
      ? [{ href: "/media", label: copy.navMedia, short: copy.navMediaShort, icon: "camera" as const }]
      : []),
    ...(showArea
      ? [
          {
            href: "/area",
            label: showTeam ? copy.navOverview : copy.navArea,
            short: showTeam ? copy.navOverview : copy.navAreaShort,
            icon: "area" as const,
          },
        ]
      : []),
    ...(showTeam
      ? [
          { href: "/squadra", label: copy.navRoster, short: copy.navRoster, icon: "team" as const },
          { href: "/squadra/inviti", label: copy.navInvites, short: copy.navInvites, icon: "invite" as const },
        ]
      : []),
    ...(showPlayerTeam
      ? [{ href: "/area/squadra", label: copy.navPlayerTeam, short: copy.navPlayerTeam, icon: "users" as const }]
      : []),
    ...(showAdmin
      ? [
          {
            href: "/admin",
            label: copy.navAdmin,
            short: copy.navAdminShort,
            icon: "org" as const,
            ...(mediaUnderAdmin ? { children: [{ href: "/media", label: copy.navMedia }] } : {}),
          },
        ]
      : []),
    {
      href: "/area/comunicazioni",
      label: copy.navCommunications,
      short: copy.navCommunicationsShort,
      icon: "inbox",
      badge: unreadCount,
    },
    ...(showSchool ? [{ href: "/squadra/scuola", label: copy.navSchool, short: copy.navSchool, icon: "org" as const }] : []),
    ...(showConsents
      ? [{ href: "/area/consensi", label: copy.navConsents, short: copy.navConsents, icon: "privacy" as const }]
      : []),
    { href: "/area/account", label: copy.navAccount, short: copy.navAccount, icon: "user" },
  ];
}

function Badge({ count, unreadLabel }: { count?: number; unreadLabel: string }) {
  if (!count) return null;
  return (
    <span className={styles.badge} aria-label={`${unreadLabel}: ${count}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavList({
  items,
  pathname,
  unreadLabel,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  unreadLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => {
        const active = isItemActive(item, pathname);
        const current = isActive(item.href, pathname);
        return (
          <li key={item.href}>
            <NavLink
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navActive : ""}`}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon name={item.icon} size={20} />
              <span className={styles.navLabel}>{item.label}</span>
              <Badge count={item.badge} unreadLabel={unreadLabel} />
            </NavLink>
            {item.children?.length ? (
              <ul className={styles.navChildren}>
                {item.children.map((child) => (
                  <li key={child.href}>
                    <NavLink
                      href={child.href}
                      className={`${styles.navChild} ${isActive(child.href, pathname) ? styles.navActive : ""}`}
                      aria-current={isActive(child.href, pathname) ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      {child.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SessionBlock({
  email,
  signedInAs,
  logout,
}: {
  email?: string | null;
  signedInAs: string;
  logout: string;
}) {
  return (
    <div className={styles.session}>
      {email ? (
        <div className={styles.identity}>
          <Avatar name={email} size="sm" />
          <span className={styles.identityCopy}>
            <span className={styles.identityLabel}>{signedInAs}</span>
            <span className={styles.email}>{email}</span>
          </span>
        </div>
      ) : null}
      <form action={logoutAction} data-view-allow="logout">
        <button type="submit" className={styles.logout}>
          <Icon name="logout" size={18} />
          {logout}
        </button>
      </form>
    </div>
  );
}

export function AppNav({ copy, brandHref, email, ...flags }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openForPath, setOpenForPath] = useState(pathname);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  if (openForPath !== pathname) {
    setOpenForPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const items = buildItems({ copy, ...flags });
  const focusMode = FOCUS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const tabs = items.slice(0, TAB_LIMIT);
  const menuBadge = items.slice(TAB_LIMIT).reduce((sum, item) => sum + (item.badge ?? 0), 0);

  return (
    <>
      <header className={styles.header}>
        <BrandMark href={brandHref} compact />
        <button
          ref={toggleRef}
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="app-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name="menu" size={20} />
          <span className={styles.menuLabel}>{copy.navMenu}</span>
          {menuBadge ? <span className={styles.dot} aria-hidden="true" /> : null}
        </button>
        <nav className={styles.sidebarNav} aria-label={copy.navPrimary}>
          <NavList items={items} pathname={pathname} unreadLabel={copy.unreadBadge} />
        </nav>
        <div className={styles.sidebarFoot}>
          <SessionBlock email={email} signedInAs={copy.navSignedInAs} logout={copy.logout} />
        </div>
      </header>

      {focusMode ? null : (
        <nav className={styles.tabbar} aria-label={copy.navTabs}>
          {tabs.map((item) => {
            const active = isItemActive(item, pathname);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                aria-current={isActive(item.href, pathname) ? "page" : undefined}
              >
                <span className={styles.tabIcon}>
                  <Icon name={item.icon} size={22} />
                  {item.badge ? <span className={styles.tabBadge} aria-hidden="true">{item.badge > 9 ? "9+" : item.badge}</span> : null}
                </span>
                <span className={styles.tabLabel}>{item.short}</span>
                {item.badge ? <span className="srOnly">{`${copy.unreadBadge}: ${item.badge}`}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      )}

      <div className={styles.sheetLayer} hidden={!open}>
        <button
          type="button"
          className={styles.backdrop}
          aria-label={copy.navClose}
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
        <div
          ref={sheetRef}
          id="app-menu"
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={copy.navMenu}
        >
          <div className={styles.sheetHead}>
            <span className={styles.sheetTitle}>{copy.navMenu}</span>
            <button type="button" className={styles.sheetClose} onClick={() => setOpen(false)}>
              <Icon name="close" size={20} />
              <span className="srOnly">{copy.navClose}</span>
            </button>
          </div>
          <nav aria-label={copy.navPrimary}>
            <NavList
              items={items}
              pathname={pathname}
              unreadLabel={copy.unreadBadge}
              onNavigate={() => setOpen(false)}
            />
          </nav>
          <SessionBlock email={email} signedInAs={copy.navSignedInAs} logout={copy.logout} />
        </div>
      </div>
    </>
  );
}
