import { listCurrentLegalVersions } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminLegalPage() {
  const documents = await listCurrentLegalVersions();
  return (
    <AdminFrame path="/admin/informative">
      <PageHeader title={it.navAdminLegal} description={it.adminLegalHelp} />
      <ul className={styles.list}>
        {documents.map((document) => (
          <li key={document.id} className={styles.item}>
            <span>
              <strong>{document.title}</strong>
              <span className={styles.meta}>
                {document.slug} · {document.versions[0]?.version ?? "—"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </AdminFrame>
  );
}
