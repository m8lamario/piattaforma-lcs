"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { it } from "@/shared/i18n/it";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import styles from "./AppShell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  children?: { href: string; label: string }[];
};

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  showPlayerTeam?: boolean;
  showConsents?: boolean;
  showSchool?: boolean;
  unreadCount?: number;
  withdrawRegistrationId?: string | null;
};

function pathAndQuery(href: string) {
  const [path, query] = href.split("?");
  return { path: path ?? href, query: query ?? "" };
}

function isActive(href: string, pathname: string, search: string) {
  if (href === "/area") {
    return (
      pathname === "/area" ||
      pathname.startsWith("/area/registrazione") ||
      pathname.startsWith("/area/dati") ||
      pathname.startsWith("/area/pagamento")
    );
  }
  const { path, query } = pathAndQuery(href);
  if (path === "/squadra" && query.startsWith("stato=")) {
    return pathname === "/squadra" && search === `?${query}`;
  }
  if (href === "/squadra") {
    if (pathname !== "/squadra") return false;
    return !search.startsWith("?stato=open");
  }
  if (href === "/squadra/scuola") {
    return pathname === "/squadra/scuola" || pathname.startsWith("/squadra/scuola/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(item: NavItem, pathname: string) {
  if (item.href === "/squadra") {
    return pathname === "/squadra" || pathname.startsWith("/squadra/inviti");
  }
  return isActive(item.href, pathname, "");
}

export function AppNav({
  email,
  showTeam,
  showAdmin,
  showPlayerTeam,
  showConsents = false,
  showSchool,
  unreadCount = 0,
  withdrawRegistrationId = null,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [open, setOpen] = useState(false);
  const [openForPath, setOpenForPath] = useState(pathname);
  if (openForPath !== pathname) {
    setOpenForPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links: NavItem[] = [
    { href: "/area", label: showTeam ? it.navOverview : it.navArea, icon: "area" },
    ...(showConsents && !showTeam ? [{ href: "/area/consensi", label: it.navConsents, icon: "privacy" as const }] : []),
    ...(showTeam
      ? [
          {
            href: "/squadra",
            label: it.navTeam,
            icon: "team" as const,
            children: [
              { href: "/squadra", label: it.rosterTitle },
              { href: "/squadra?stato=open", label: it.navRosterStatus },
              { href: "/squadra/inviti", label: it.invitesNav },
            ],
          },
        ]
      : []),
    ...(showPlayerTeam ? [{ href: "/area/squadra", label: it.navPlayerTeam, icon: "users" as const }] : []),
    ...(showAdmin ? [{ href: "/admin", label: it.navAdmin, icon: "org" as const }] : []),
    { href: "/area/comunicazioni", label: it.navCommunications, icon: "inbox", badge: unreadCount },
    ...(showSchool ? [{ href: "/squadra/scuola", label: it.navSchool, icon: "org" as const }] : []),
    ...(showConsents && showTeam ? [{ href: "/area/consensi", label: it.navConsents, icon: "privacy" as const }] : []),
    { href: "/area/account", label: it.navAccount, icon: "user" },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="app-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? "close" : "menu"} size={18} />
          <span>{open ? it.navClose : it.navMenu}</span>
        </button>
      </div>
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
        <nav id="app-nav" className={styles.nav} aria-label="Principale">
          {links.map((link) => (
            <div key={link.href + link.label} className={link.children ? styles.navGroup : undefined}>
              <Link
                href={link.href}
                className={
                  (link.children ? isGroupActive(link, pathname) : isActive(link.href, pathname, search))
                    ? styles.navActive
                    : undefined
                }
                aria-current={
                  !link.children && isActive(link.href, pathname, search) ? "page" : undefined
                }
                onClick={() => setOpen(false)}
              >
                <Icon name={link.icon} size={18} />
                {link.label}
                {link.badge ? (
                  <span className={styles.badge} aria-label={`${it.unreadBadge}: ${link.badge}`}>
                    {link.badge}
                  </span>
                ) : null}
              </Link>
              {link.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`${styles.navChild} ${isActive(child.href, pathname, search) ? styles.navActive : ""}`}
                  aria-current={isActive(child.href, pathname, search) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.session}>
          {email ? <span className={styles.email}>{email}</span> : null}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className={styles.logout}>
              {it.logout}
            </Button>
          </form>
          {withdrawRegistrationId ? <WithdrawForm registrationId={withdrawRegistrationId} quiet /> : null}
        </div>
      </div>
    </>
  );
}
