import { listPaymentsAdmin } from "@/features/admin/data/catalog";
import { decimalText } from "@/features/admin/domain/format";
import { paymentDateLabel, paymentMethodLabel } from "@/features/payments/domain/export";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { isSuperAdmin } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ButtonLink } from "@/shared/ui/Button";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminPaymentsPage() {
  const [{ actor }, payments] = await Promise.all([requireStaff("/admin/pagamenti"), listPaymentsAdmin()]);
  return (
    <AdminFrame path="/admin/pagamenti" actor={actor}>
      <PageHeader
        title={it.navAdminPayments}
        description={it.adminPaymentsHelp}
        aside={
          <>
            {isSuperAdmin(actor) ? (
              <ButtonLink href="/admin/pagamenti/bonifico" variant="secondary">
                {it.adminBankLink}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/admin/pagamenti/export">{it.adminPaymentsExport}</ButtonLink>
          </>
        }
      />
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
                  {paymentMethodLabel(payment.provider)}
                  {payment.bankTransfer?.reference ? ` · ${payment.bankTransfer.reference}` : ""}
                  {payment.paidAt ? ` · ${paymentDateLabel(payment.paidAt)}` : ""}
                  {" · "}
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
