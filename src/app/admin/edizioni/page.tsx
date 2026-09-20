import Link from "next/link";
import { listCompetitionsWithEditions } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { EditionForm } from "@/features/admin/ui/EditionForm";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminEditionsPage() {
  const competitions = await listCompetitionsWithEditions();
  return (
    <AdminFrame path="/admin/edizioni">
      <PageHeader title={it.navAdminEditions} description={it.adminEditionsHelp} />
      <ul className={styles.list}>
        {competitions.flatMap((competition) =>
          competition.editions.map((edition) => (
            <li key={edition.id}>
              <Link href={`/admin/edizioni/${edition.id}`} className={styles.item}>
                <span>
                  <strong>
                    {competition.name} · {edition.name}
                  </strong>
                  <span className={styles.meta}>{edition.year}</span>
                </span>
              </Link>
            </li>
          )),
        )}
      </ul>
      <h2 className={styles.sectionTitle}>{it.adminCreateEdition}</h2>
      <EditionForm mode="create" />
    </AdminFrame>
  );
}
