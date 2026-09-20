import Link from "next/link";
import {
  listPendingMedicalDocuments,
  listRecentReviewedMedicalDocuments,
} from "@/features/documents/data/documents";
import { filterOptions } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

function playerName(document: { playerProfile: { firstName: string; lastName: string } }) {
  return `${document.playerProfile.firstName} ${document.playerProfile.lastName}`.trim();
}

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  return it.statusDocumentPENDING_REVIEW;
}

function statusTone(status: string): StatusTone {
  if (status === "APPROVED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

type Props = {
  searchParams: Promise<{ teamId?: string; q?: string }>;
};

export default async function AdminDocumentsPage({ searchParams }: Props) {
  const query = await searchParams;
  const [pending, recent, options] = await Promise.all([
    listPendingMedicalDocuments({ teamId: query.teamId, q: query.q?.trim() || undefined }),
    listRecentReviewedMedicalDocuments(),
    filterOptions(),
  ]);

  return (
    <AdminFrame path="/admin/documenti">
      <PageHeader title={it.adminDocumentsTitle} description={it.adminDocumentsHelp} />
      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
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
            <label className={fields.label} htmlFor="q">
              {it.adminSearchName}
            </label>
            <input id="q" name="q" className={fields.input} defaultValue={query.q ?? ""} />
          </div>
        </div>
        <button className={fields.input} type="submit">
          {it.filterApply}
        </button>
      </form>
      {pending.length === 0 ? (
        <p className={styles.empty} role="status">
          {it.adminDocumentsEmpty}
        </p>
      ) : (
        <ul className={styles.list}>
          {pending.map((document) => (
            <li key={document.id}>
              <Link href={`/admin/documenti/${document.id}`} className={styles.item}>
                <span>
                  <strong>{playerName(document)}</strong>
                  <span className={styles.meta}>{document.registration.team.name}</span>
                </span>
                <StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {recent.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{it.adminRecentDocuments}</h2>
          <ul className={styles.list}>
            {recent.map((document) => (
              <li key={document.id}>
                <Link href={`/admin/documenti/${document.id}`} className={styles.item}>
                  <span>
                    <strong>{playerName(document)}</strong>
                    <span className={styles.meta}>{document.registration.team.name}</span>
                  </span>
                  <StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminFrame>
  );
}
