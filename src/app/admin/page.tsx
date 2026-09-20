import Link from "next/link";
import { adminHubStats } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

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
      <ul className={styles.list}>
        <li>
          <Link href="/admin/documenti" className={styles.item}>
            <strong>{it.navAdminDocuments}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/registrazioni" className={styles.item}>
            <strong>{it.navAdminRegistrations}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/edizioni" className={styles.item}>
            <strong>{it.navAdminEditions}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/squadre" className={styles.item}>
            <strong>{it.navAdminTeams}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/pagamenti" className={styles.item}>
            <strong>{it.navAdminPayments}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/audit" className={styles.item}>
            <strong>{it.navAdminAudit}</strong>
          </Link>
        </li>
        <li>
          <Link href="/admin/informative" className={styles.item}>
            <strong>{it.navAdminLegal}</strong>
          </Link>
        </li>
      </ul>
    </AdminFrame>
  );
}
