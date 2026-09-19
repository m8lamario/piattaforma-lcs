"use client";

import { useState } from "react";
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

export function AppNav({ email, showTeam, showAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links: { href: string; label: string; icon: IconName }[] = [
    { href: "/area", label: it.navArea, icon: "area" },
    ...(showTeam ? [{ href: "/squadra", label: it.navTeam, icon: "team" as const }] : []),
    ...(showAdmin
      ? [{ href: "/admin/documenti", label: it.navAdminDocuments, icon: "documents" as const }]
      : []),
    { href: "/area/comunicazioni", label: it.navCommunications, icon: "inbox" },
  ];

  return (
    <>
      <button
        type="button"
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls="app-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "menu"} size={18} />
        {open ? it.navClose : it.navMenu}
      </button>
      <nav id="app-nav" className={`${styles.nav} ${open ? styles.navOpen : ""}`} aria-label="Principale">
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
          </Link>
        ))}
      </nav>
      <div className={styles.session}>
        <ThemeToggle showLabel />
        {email ? <span className={styles.email}>{email}</span> : null}
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className={styles.logout}>
            {it.logout}
          </Button>
        </form>
      </div>
    </>
  );
}
