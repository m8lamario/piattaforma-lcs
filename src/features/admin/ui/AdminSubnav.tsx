import Link from "next/link";
import { it } from "@/shared/i18n/it";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin", labelKey: "navAdminHub" },
  { href: "/admin/registrazioni", labelKey: "navAdminRegistrations" },
  { href: "/admin/documenti", labelKey: "navAdminDocuments" },
  { href: "/admin/edizioni", labelKey: "navAdminEditions" },
  { href: "/admin/squadre", labelKey: "navAdminTeams" },
  { href: "/admin/pagamenti", labelKey: "navAdminPayments" },
  { href: "/admin/utenti", labelKey: "navAdminUsers", superOnly: true },
  { href: "/admin/audit", labelKey: "navAdminAudit" },
  { href: "/admin/informative", labelKey: "navAdminLegal" },
] as const;

type Props = {
  pathname: string;
  showAccounts?: boolean;
};

export function AdminSubnav({ pathname, showAccounts = false }: Props) {
  return (
    <nav className={styles.subnav} aria-label={it.navAdmin}>
      {LINKS.filter((link) => !("superOnly" in link && link.superOnly) || showAccounts).map((link) => {
        const current =
          link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
            {it[link.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
