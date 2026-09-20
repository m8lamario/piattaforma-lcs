import { listPaymentsAdmin } from "@/features/admin/data/catalog";
import { decimalText } from "@/features/admin/domain/format";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminPaymentsPage() {
  const payments = await listPaymentsAdmin();
  return (
    <AdminFrame path="/admin/pagamenti">
      <PageHeader title={it.navAdminPayments} description={it.adminPaymentsHelp} />
      {payments.length === 0 ? (
        <p className={styles.empty}>{it.adminPaymentsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {payments.map((payment) => (
            <li key={payment.id} className={styles.item}>
              <span>
                <strong>
                  {decimalText(payment.amount)} {payment.currency}
                </strong>
                <span className={styles.meta}>
                  {payment.edition.competition.name} · {payment.team?.name ??
                    `${payment.registration?.playerProfile.firstName ?? ""} ${payment.registration?.playerProfile.lastName ?? ""}`.trim()}
                </span>
              </span>
              <StatusChip tone={payment.status === "SUCCEEDED" ? "complete" : "attention"}>{payment.status}</StatusChip>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
