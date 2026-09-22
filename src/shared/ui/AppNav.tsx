"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import { it } from "@/shared/i18n/it";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

type Props = {
  email?: string | null;
  showTeam?: boolean;
  showAdmin?: boolean;
  showPlayerTeam?: boolean;
  unreadCount?: number;
};

function isActive(href: string, pathname: string) {
  if (href === "/area") {
    return (
      pathname === "/area" ||
      pathname.startsWith("/area/registrazione") ||
      pathname.startsWith("/area/dati") ||
      pathname.startsWith("/area/pagamento")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ email, showTeam, showAdmin, showPlayerTeam, unreadCount = 0 }: Props) {
  const pathname = usePathname();
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

  const links: { href: string; label: string; icon: IconName; badge?: number }[] = [
    { href: "/area", label: it.navArea, icon: "area" },
    ...(showTeam ? [{ href: "/squadra", label: it.navTeam, icon: "team" as const }] : []),
    ...(showPlayerTeam ? [{ href: "/area/squadra", label: it.navPlayerTeam, icon: "users" as const }] : []),
    ...(showAdmin ? [{ href: "/admin", label: it.navAdmin, icon: "org" as const }] : []),
    { href: "/area/comunicazioni", label: it.navCommunications, icon: "inbox", badge: unreadCount },
    { href: "/area/account", label: it.navAccount, icon: "user" },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <ThemeToggle />
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
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href, pathname) ? styles.navActive : undefined}
              aria-current={isActive(link.href, pathname) ? "page" : undefined}
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
          ))}
        </nav>
        <div className={styles.session}>
          <div className={styles.drawerTheme}>
            <ThemeToggle showLabel />
          </div>
          {email ? <span className={styles.email}>{email}</span> : null}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className={styles.logout}>
              {it.logout}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
