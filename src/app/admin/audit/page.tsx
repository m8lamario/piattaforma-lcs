import { listAuditLogs } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminAuditPage() {
  const rows = await listAuditLogs();
  return (
    <AdminFrame path="/admin/audit">
      <PageHeader title={it.navAdminAudit} description={it.adminAuditHelp} />
      {rows.length === 0 ? (
        <p className={styles.empty}>{it.adminAuditEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id} className={styles.item}>
              <span>
                <strong>{row.action}</strong>
                <span className={styles.meta}>
                  {row.entityType} · {row.actor?.email ?? "system"} · {row.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
