import Link from "next/link";
import { redirect } from "next/navigation";
import { blockedCounts, listAdminViews } from "@/features/admin-view/data/sessions";
import { personLabel, sessionDurationSeconds } from "@/features/admin-view/domain/policy";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

type Props = { searchParams: Promise<{ q?: string }> };

function formatWhen(value: Date) {
  return value.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest} s`;
  return `${minutes} min ${rest} s`;
}

function reasonLabel(reason: string | null, active: boolean) {
  if (active) return it.adminViewReasonACTIVE;
  if (reason === "MANUAL") return it.adminViewReasonMANUAL;
  if (reason === "EXPIRED") return it.adminViewReasonEXPIRED;
  if (reason === "SUPERSEDED") return it.adminViewReasonSUPERSEDED;
  if (reason === "REVOKED") return it.adminViewReasonREVOKED;
  return it.adminViewReasonMANUAL;
}

export default async function AdminViewsPage({ searchParams }: Props) {
  const [{ actor }, query] = await Promise.all([requireStaff("/admin/visualizzazioni"), searchParams]);
  if (!authorize(actor, "user:view_as").allow) redirect("/admin");
  const q = query.q?.trim() || undefined;
  const rows = await listAdminViews(q);
  const counts = await blockedCounts(rows.map((row) => row.id));

  return (
    <AdminFrame path="/admin/visualizzazioni" actor={actor}>
      <PageHeader title={it.adminViewHistoryTitle} description={it.adminViewHistoryHelp} />
      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="q">
              {it.adminViewSearch}
            </label>
            <input id="q" name="q" className={fields.input} defaultValue={query.q ?? ""} />
          </div>
          <div>
            <Button type="submit">{it.filterApply}</Button>
          </div>
        </div>
      </form>
      {rows.length === 0 ? (
        <p className={styles.empty}>{it.adminViewHistoryEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => {
            const active = row.endedAt === null;
            const target = personLabel({
              email: row.target.email,
              name: row.target.name,
              firstName: row.target.playerProfile?.firstName,
              lastName: row.target.playerProfile?.lastName,
            });
            return (
              <li key={row.id}>
                <Link href={`/admin/visualizzazioni/${row.id}`} className={styles.item}>
                  <span>
                    <strong>{target}</strong>
                    <span className={styles.meta}>
                      {it.adminViewAdmin}: {row.admin.email} · {formatWhen(row.startedAt)} ·{" "}
                      {formatDuration(sessionDurationSeconds(row.startedAt, active ? null : row.endedAt))} ·{" "}
                      {reasonLabel(row.endReason, active)} · {it.adminViewBlockedTitle}: {counts.get(row.id) ?? 0}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminFrame>
  );
}
