import Link from "next/link";
import type { SchoolRegistrationStatus } from "@generated/client";
import { listSchoolAccessRequests } from "@/features/school-access/data/requests";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

const STATUSES: SchoolRegistrationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_COPY: Record<SchoolRegistrationStatus, string> = {
  PENDING: it.schoolAccessStatusPending,
  APPROVED: it.schoolAccessStatusApproved,
  REJECTED: it.schoolAccessStatusRejected,
};

function statusTone(status: SchoolRegistrationStatus): StatusTone {
  if (status === "APPROVED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminSchoolRequestsPage({ searchParams }: Props) {
  const query = await searchParams;
  const status = STATUSES.includes(query.status as SchoolRegistrationStatus)
    ? (query.status as SchoolRegistrationStatus)
    : "PENDING";
  const rows = await listSchoolAccessRequests(status);

  return (
    <AdminFrame path="/admin/richieste">
      <PageHeader title={it.navAdminSchoolRequests} description={it.adminSchoolRequestsHelp} />
      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="status">
              {it.adminStatus}
            </label>
            <select id="status" name="status" className={fields.input} defaultValue={status}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_COPY[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button type="submit">{it.filterApply}</Button>
          </div>
        </div>
      </form>
      {rows.length === 0 ? (
        <p className={styles.empty}>{it.adminSchoolRequestsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/richieste/${row.id}`} className={styles.item}>
                <span>
                  <strong>{row.schoolName}</strong>
                  <span className={styles.meta}>
                    {row.city} · {row.edition.competition.name} · {row.edition.name} · {row.email}
                  </span>
                </span>
                <StatusChip tone={statusTone(row.status)}>{STATUS_COPY[row.status]}</StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
