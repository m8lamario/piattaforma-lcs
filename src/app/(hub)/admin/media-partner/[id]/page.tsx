import { notFound, redirect } from "next/navigation";
import { getMediaPartner, listCompetitionsForMedia } from "@/features/media-partners/data/partners";
import { PartnerAccountForm } from "@/features/media-partners/ui/PartnerAccountForm";
import { PartnerOrgForm } from "@/features/media-partners/ui/PartnerOrgForm";
import { PartnerStatusForm } from "@/features/media-partners/ui/PartnerStatusForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMediaPartnerDetailPage({ params }: Props) {
  const [{ actor }, { id }] = await Promise.all([requireStaff("/admin/media-partner"), params]);
  if (!authorize(actor, "media:manage").allow) redirect("/admin");

  const [partner, competitions] = await Promise.all([getMediaPartner(id), listCompetitionsForMedia()]);
  if (!partner) notFound();

  return (
    <AdminFrame path={`/admin/media-partner/${id}`} actor={actor}>
      <PageHeader
        kicker={it.mediaPartnersTitle}
        title={partner.name}
        aside={
          <StatusChip tone={partner.status === "ACTIVE" ? "complete" : "danger"}>
            {partner.status === "ACTIVE" ? it.mediaPartnerStatusActive : it.mediaPartnerStatusSuspended}
          </StatusChip>
        }
      />
      <div className={styles.twoColGrid}>
        <section className={styles.colMain}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.mediaPartnerAccounts}</h2>
            {partner.accounts.length === 0 ? (
              <p className={styles.empty}>{it.mediaPartnerAccountsEmpty}</p>
            ) : (
              <ul className={styles.list}>
                {partner.accounts.map((account) => (
                  <li key={account.id} className={styles.item}>
                    <span>
                      <strong>{account.user.name ?? account.user.email}</strong>
                      <span className={styles.meta}>
                        {account.user.email}
                        {!account.activatedAt && !account.user.passwordHash
                          ? ` · ${it.mediaPartnerPendingActivation}`
                          : ""}
                      </span>
                    </span>
                    <StatusChip tone={account.status === "ACTIVE" ? "complete" : "danger"}>
                      {account.status === "ACTIVE" ? it.mediaPartnerStatusActive : it.mediaPartnerStatusSuspended}
                    </StatusChip>
                    <PartnerStatusForm
                      id={account.id}
                      status={account.status}
                      kind="account"
                      canResend={account.status === "ACTIVE" && !account.activatedAt && !account.user.passwordHash}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.mediaPartnerCreateAccount}</h2>
            <PartnerAccountForm mediaPartnerId={partner.id} />
          </div>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.mediaPartnerSave}</h2>
            <PartnerOrgForm
              mode="edit"
              partnerId={partner.id}
              name={partner.name}
              selectedIds={partner.competitions.map((row) => row.competitionId)}
              competitions={competitions}
            />
            <PartnerStatusForm id={partner.id} status={partner.status} kind="organization" />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
