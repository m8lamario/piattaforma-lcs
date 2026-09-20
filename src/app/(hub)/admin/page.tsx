import Link from "next/link";
import { adminHubStats } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

const HUB_SECTIONS = [
  { href: "/admin/documenti", titleKey: "navAdminDocuments", descKey: "adminDocumentsHelp" },
  { href: "/admin/registrazioni", titleKey: "navAdminRegistrations", descKey: "adminRegistrationsHelp" },
  { href: "/admin/edizioni", titleKey: "navAdminEditions", descKey: "adminEditionsHelp" },
  { href: "/admin/squadre", titleKey: "navAdminTeams", descKey: "adminTeamsHelp" },
  { href: "/admin/pagamenti", titleKey: "navAdminPayments", descKey: "adminPaymentsHelp" },
  { href: "/admin/audit", titleKey: "navAdminAudit", descKey: "adminAuditHelp" },
  { href: "/admin/informative", titleKey: "navAdminLegal", descKey: "adminLegalHelp" },
] as const;

export default async function AdminHubPage() {
  const stats = await adminHubStats();
  return (
    <AdminFrame path="/admin">
      <PageHeader kicker={it.navAdmin} title={it.adminHubTitle} description={it.adminHubHelp} />
      <div className={styles.stats}>
        <p className={styles.stat}>
          <strong>{stats.pendingDocuments}</strong>
          <span>{it.adminStatPendingDocs}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.registrations}</strong>
          <span>{it.adminStatRegistrations}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.byStatus.APPROVED ?? 0}</strong>
          <span>{it.statusAPPROVED}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.byStatus.IN_PROGRESS ?? 0}</strong>
          <span>{it.statusIN_PROGRESS}</span>
        </p>
      </div>

      <nav className={styles.hubNavGrid} aria-label={it.adminHubTitle}>
        {HUB_SECTIONS.map((sec) => (
          <Link key={sec.href} href={sec.href} className={styles.hubTile}>
            <strong>{it[sec.titleKey]}</strong>
            <span>{it[sec.descKey]}</span>
          </Link>
        ))}
      </nav>
    </AdminFrame>
  );
}
