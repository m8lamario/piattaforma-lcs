"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import { it } from "@/shared/i18n/it";
import { Avatar } from "./Avatar";
import { BrandMark } from "./BrandMark";
import { Icon, type IconName } from "./Icon";
import styles from "./AppShell.module.css";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: IconName;
  badge?: number;
  children?: { href: string; label: string }[];
};

type Props = {
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
      { href: "/lega", label: it.navOverview, short: it.navOverview, icon: "area" },
      { href: "/lega/scuole", label: it.navLeagueSchools, short: it.navLeagueSchools, icon: "org" },
      { href: "/lega/giocatori", label: it.navLeaguePlayers, short: it.navLeaguePlayers, icon: "users" },
    ];
  }
  return [
    ...(showMedia && !mediaUnderAdmin
      ? [{ href: "/media", label: it.navMedia, short: it.navMediaShort, icon: "camera" as const }]
      : []),
    ...(showArea
      ? [
          {
            href: "/area",
            label: showTeam ? it.navOverview : it.navArea,
            short: showTeam ? it.navOverview : it.navAreaShort,
            icon: "area" as const,
          },
        ]
      : []),
    ...(showTeam
      ? [
          { href: "/squadra", label: it.navRoster, short: it.navRoster, icon: "team" as const },
          { href: "/squadra/inviti", label: it.navInvites, short: it.navInvites, icon: "invite" as const },
        ]
      : []),
    ...(showPlayerTeam
      ? [{ href: "/area/squadra", label: it.navPlayerTeam, short: it.navPlayerTeam, icon: "users" as const }]
      : []),
    ...(showAdmin
      ? [
          {
            href: "/admin",
            label: it.navAdmin,
            short: it.navAdminShort,
            icon: "org" as const,
            ...(mediaUnderAdmin ? { children: [{ href: "/media", label: it.navMedia }] } : {}),
          },
        ]
      : []),
    {
      href: "/area/comunicazioni",
      label: it.navCommunications,
      short: it.navCommunicationsShort,
      icon: "inbox",
      badge: unreadCount,
    },
    ...(showSchool ? [{ href: "/squadra/scuola", label: it.navSchool, short: it.navSchool, icon: "org" as const }] : []),
    ...(showConsents
      ? [{ href: "/area/consensi", label: it.navConsents, short: it.navConsents, icon: "privacy" as const }]
      : []),
    { href: "/area/account", label: it.navAccount, short: it.navAccount, icon: "user" },
  ];
}

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className={styles.badge} aria-label={`${it.unreadBadge}: ${count}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
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
              <Badge count={item.badge} />
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

function SessionBlock({ email }: { email?: string | null }) {
  return (
    <div className={styles.session}>
      {email ? (
        <div className={styles.identity}>
          <Avatar name={email} size="sm" />
          <span className={styles.identityCopy}>
            <span className={styles.identityLabel}>{it.navSignedInAs}</span>
            <span className={styles.email}>{email}</span>
          </span>
        </div>
      ) : null}
      <form action={logoutAction} data-view-allow="logout">
        <button type="submit" className={styles.logout}>
          <Icon name="logout" size={18} />
          {it.logout}
        </button>
      </form>
    </div>
  );
}

export function AppNav({ brandHref, email, ...flags }: Props) {
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

  const items = buildItems(flags);
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
          <span className={styles.menuLabel}>{it.navMenu}</span>
          {menuBadge ? <span className={styles.dot} aria-hidden="true" /> : null}
        </button>
        <nav className={styles.sidebarNav} aria-label={it.navPrimary}>
          <NavList items={items} pathname={pathname} />
        </nav>
        <div className={styles.sidebarFoot}>
          <SessionBlock email={email} />
        </div>
      </header>

      {focusMode ? null : (
        <nav className={styles.tabbar} aria-label={it.navTabs}>
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
                {item.badge ? <span className="srOnly">{`${it.unreadBadge}: ${item.badge}`}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      )}

      <div className={styles.sheetLayer} hidden={!open}>
        <button
          type="button"
          className={styles.backdrop}
          aria-label={it.navClose}
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
        <div
          ref={sheetRef}
          id="app-menu"
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={it.navMenu}
        >
          <div className={styles.sheetHead}>
            <span className={styles.sheetTitle}>{it.navMenu}</span>
            <button type="button" className={styles.sheetClose} onClick={() => setOpen(false)}>
              <Icon name="close" size={20} />
              <span className="srOnly">{it.navClose}</span>
            </button>
          </div>
          <nav aria-label={it.navPrimary}>
            <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
          <SessionBlock email={email} />
        </div>
      </div>
    </>
  );
}
