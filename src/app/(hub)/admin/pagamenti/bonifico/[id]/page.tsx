import { notFound, redirect } from "next/navigation";
import { loadBankTransferDetail } from "@/features/payments/data/bank-transfer";
import { formatSignedEuro } from "@/features/payments/domain/fees";
import { paymentDateLabel } from "@/features/payments/domain/export";
import { BankTransferAllocationForm } from "@/features/admin/ui/BankTransferAllocationForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { isSuperAdmin } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

function money(cents: number, currency: string) {
  return `${formatSignedEuro(cents)} ${currency}`;
}

export default async function AdminBankTransferDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ actor }, transfer] = await Promise.all([
    requireStaff(`/admin/pagamenti/bonifico/${id}`),
    loadBankTransferDetail(id),
  ]);
  if (!isSuperAdmin(actor)) redirect("/admin/pagamenti");
  if (!transfer) notFound();

  const active = transfer.people.filter((person) => person.blocked !== "inactive" || person.linkedCents != null);

  return (
    <AdminFrame path="/admin/pagamenti" actor={actor}>
      <PageHeader
        title={it.adminBankDetail}
        description={`${transfer.editionLabel} · ${transfer.schoolName} · ${transfer.teamName}`}
        aside={
          <ButtonLink href="/admin/pagamenti/bonifico" variant="secondary">
            {it.adminBankBackToForm}
          </ButtonLink>
        }
      />
      <div className={styles.colMain}>
        <section className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>{transfer.reference}</h2>
          <div className={styles.amountStats}>
            <p className={styles.amountStat}>
              <span>{it.adminBankReceived}</span>
              <strong>{money(transfer.receivedCents, transfer.currency)}</strong>
            </p>
            <p className={styles.amountStat}>
              <span>{it.adminBankUsed}</span>
              <strong>{money(transfer.usedCents, transfer.currency)}</strong>
            </p>
            <p className={styles.amountStat}>
              <span>{it.adminBankResidual}</span>
              <strong>{money(transfer.residualCents, transfer.currency)}</strong>
            </p>
          </div>
          <p className={styles.meta}>
            {it.adminBankDate}: {paymentDateLabel(transfer.paidAt)} · {it.adminBankOperator}: {transfer.operator}
          </p>
          {transfer.channel === "team" ? <p className={styles.meta}>{it.adminBankTeamLocked}</p> : null}
        </section>

        {transfer.channel === "team" ? (
          <section className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.adminBankCovered}</h2>
            {active.length === 0 ? (
              <p className={styles.meta}>{it.adminBankNoPeople}</p>
            ) : (
              <ul className={styles.confirmList}>
                {active.map((person) => (
                  <li key={person.registrationId}>
                    {person.name || it.adminBankUnnamed} · {person.category === "STAFF" ? it.adminFeesStaff : it.adminFeesPlayer}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <BankTransferAllocationForm
            transferId={transfer.id}
            currency={transfer.currency}
            receivedCents={transfer.receivedCents}
            people={transfer.people}
          />
        )}
      </div>
    </AdminFrame>
  );
}
