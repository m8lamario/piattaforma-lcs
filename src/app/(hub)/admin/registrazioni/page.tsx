import Link from "next/link";
import {
  filterOptions,
  listRegistrationsAdmin,
} from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";
import type { RegistrationStatus } from "@generated/client";

const STATUS_COPY: Record<string, string> = {
  INVITED: it.statusINVITED,
  ACCOUNT_CREATED: it.statusACCOUNT_CREATED,
  IN_PROGRESS: it.statusIN_PROGRESS,
  PENDING_REVIEW: it.statusPENDING_REVIEW,
  CHANGES_REQUESTED: it.statusCHANGES_REQUESTED,
  PAYMENT_PENDING: it.statusPAYMENT_PENDING,
  APPROVED: it.statusAPPROVED,
  WITHDRAWN: it.statusWITHDRAWN,
  REMOVED: it.statusREMOVED,
};

type Props = {
  searchParams: Promise<{ editionId?: string; teamId?: string; status?: string; q?: string }>;
};

export default async function AdminRegistrationsPage({ searchParams }: Props) {
  const query = await searchParams;
  const status = query.status && query.status in STATUS_COPY ? (query.status as RegistrationStatus) : undefined;
  const [rows, options] = await Promise.all([
    listRegistrationsAdmin({
      editionId: query.editionId,
      teamId: query.teamId,
      status,
      q: query.q?.trim() || undefined,
    }),
    filterOptions(),
  ]);

  return (
    <AdminFrame path="/admin/registrazioni">
      <PageHeader title={it.navAdminRegistrations} description={it.adminRegistrationsHelp} />
      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="editionId">
              {it.adminEdition}
            </label>
            <select id="editionId" name="editionId" className={fields.input} defaultValue={query.editionId ?? ""}>
              <option value="">{it.filterAll}</option>
              {options.editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.competition.name} · {edition.name}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="teamId">
              {it.adminTeam}
            </label>
            <select id="teamId" name="teamId" className={fields.input} defaultValue={query.teamId ?? ""}>
              <option value="">{it.filterAll}</option>
              {options.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="status">
              {it.adminStatus}
            </label>
            <select id="status" name="status" className={fields.input} defaultValue={query.status ?? ""}>
              <option value="">{it.filterAll}</option>
              {Object.entries(STATUS_COPY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="q">
              {it.adminSearchName}
            </label>
            <input id="q" name="q" className={fields.input} defaultValue={query.q ?? ""} />
          </div>
          <div>
            <Button type="submit">{it.filterApply}</Button>
          </div>
        </div>
      </form>
      {rows.length === 0 ? (
        <p className={styles.empty}>{it.adminRegistrationsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/giocatori/${row.playerProfile.id}`} className={styles.item}>
                <span>
                  <strong>
                    {row.playerProfile.firstName} {row.playerProfile.lastName}
                  </strong>
                  <span className={styles.meta}>
                    {row.edition.competition.name} · {row.team.name}
                  </span>
                </span>
                <StatusChip tone={row.status === "APPROVED" ? "complete" : row.status === "WITHDRAWN" ? "neutral" : "attention"}>
                  {STATUS_COPY[row.status] ?? row.status}
                </StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
