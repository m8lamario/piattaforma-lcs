import { listCurrentLegalVersions } from "@/features/admin/data/catalog";
import { LegalVersionNoticeForm } from "@/features/emails/ui/LegalVersionNoticeForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaff } from "@/shared/authz/requireStaff";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminLegalPage() {
  const [{ actor }, documents] = await Promise.all([
    requireStaff("/admin/informative"),
    listCurrentLegalVersions(),
  ]);
  return (
    <AdminFrame path="/admin/informative" actor={actor}>
      <PageHeader title={it.navAdminLegal} description={it.adminLegalHelp} />
      <ul className={styles.list}>
        {documents.map((document) => (
          <li key={document.id} className={styles.item}>
            <span>
              <strong>{document.title}</strong>
              <span className={styles.meta}>
                {document.slug} · {document.versions[0]?.version ?? "—"}
              </span>
              <LegalVersionNoticeForm slug={document.slug} />
            </span>
          </li>
        ))}
      </ul>
    </AdminFrame>
  );
}
