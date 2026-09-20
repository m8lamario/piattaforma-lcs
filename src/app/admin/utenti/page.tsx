import Link from "next/link";
import { redirect } from "next/navigation";
import { listUsersAdmin } from "@/features/admin/data/lifecycle";
import { lifecycleStatusLabel } from "@/features/admin/domain/lifecycle";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

type Props = { searchParams: Promise<{ q?: string; done?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { actor } = await requireStaff("/admin/utenti");
  if (!authorize(actor, "platform:admin").allow) redirect("/admin");
  const query = await searchParams;
  const rows = await listUsersAdmin(query.q?.trim() || undefined);

  return (
    <AdminFrame path="/admin/utenti">
      <PageHeader title={it.lifecycleUsersTitle} description={it.lifecycleUsersHelp} />
      {query.done === "deleted" ? (
        <p className={fields.bannerOk} role="status">
          {it.lifecycleDeletedDone}
        </p>
      ) : null}
      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="q">
              {it.email}
            </label>
            <input id="q" name="q" className={fields.input} defaultValue={query.q ?? ""} />
          </div>
          <button className={fields.input} type="submit">
            {it.filterApply}
          </button>
        </div>
      </form>
      {rows.length === 0 ? (
        <p className={styles.empty}>{it.lifecycleUsersEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/utenti/${row.id}`} className={styles.item}>
                <span>
                  <strong>{row.name ?? row.email}</strong>
                  <span className={styles.meta}>
                    {row.email} · {row.roles.map((role) => role.role).join(", ") || "PLAYER"}
                  </span>
                </span>
                <StatusChip tone={row.lifecycleStatus === "ACTIVE" ? "complete" : "danger"}>
                  {lifecycleStatusLabel(row.lifecycleStatus)}
                </StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
