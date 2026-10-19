import Link from "next/link";
import { redirect } from "next/navigation";
import { listCompetitionsForMedia, listMediaPartners } from "@/features/media-partners/data/partners";
import { PartnerOrgForm } from "@/features/media-partners/ui/PartnerOrgForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminMediaPartnersPage() {
  const [{ actor }, partners, competitions] = await Promise.all([
    requireStaff("/admin/media-partner"),
    listMediaPartners(),
    listCompetitionsForMedia(),
  ]);
  if (!authorize(actor, "media:manage").allow) redirect("/admin");

  return (
    <AdminFrame path="/admin/media-partner" actor={actor}>
      <PageHeader title={it.mediaPartnersTitle} description={it.adminMediaPartnersHelp} />
      <div className={styles.twoColGrid}>
        <section className={styles.colMain}>
          {partners.length === 0 ? (
            <p className={styles.empty}>{it.mediaPartnersEmpty}</p>
          ) : (
            <ul className={styles.list}>
              {partners.map((partner) => (
                <li key={partner.id}>
                  <Link href={`/admin/media-partner/${partner.id}`} className={styles.item}>
                    <span>
                      <strong>{partner.name}</strong>
                      <span className={styles.meta}>
                        {partner.competitions.map((row) => row.competition.name).join(", ")} ·{" "}
                        {partner._count.accounts} {it.mediaPartnerAccounts.toLowerCase()}
                      </span>
                    </span>
                    <StatusChip tone={partner.status === "ACTIVE" ? "complete" : "danger"}>
                      {partner.status === "ACTIVE" ? it.mediaPartnerStatusActive : it.mediaPartnerStatusSuspended}
                    </StatusChip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.mediaPartnerCreateTitle}</h2>
            <PartnerOrgForm mode="create" competitions={competitions} />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
