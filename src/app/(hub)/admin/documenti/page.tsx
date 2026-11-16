import Link from "next/link";
import {
  listPendingMedicalDocuments,
  listRecentReviewedMedicalDocuments,
  medicalFiltersFromQueue,
} from "@/features/documents/data/documents";
import { parseReviewQueueFilters, reviewDocumentHref } from "@/features/documents/domain/reviewQueue";
import { MEDICAL_CERTIFICATE_KINDS, medicalKindLabel } from "@/features/documents/domain/medicalRequirement";
import { INSPECTION_ANOMALIES } from "@/features/documents/domain/certificatePolicy";
import { filterOptions } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

function playerName(document: { playerProfile: { firstName: string; lastName: string } }) {
  return `${document.playerProfile.firstName} ${document.playerProfile.lastName}`.trim();
}

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  if (status === "EXPIRED") return it.statusDocumentEXPIRED;
  if (status === "PREVALIDATED") return it.statusDocumentPREVALIDATED;
  if (status === "PROCESSING") return it.statusDocumentPROCESSING;
  if (status === "UPLOADED") return it.statusDocumentUPLOADED;
  return it.statusDocumentPENDING_REVIEW;
}

function statusTone(status: string): StatusTone {
  if (status === "APPROVED" || status === "PREVALIDATED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

function anomalyLabel(code: string) {
  const key = `anomaly${code}` as keyof typeof it;
  return key in it ? it[key] : code;
}

type Props = {
  searchParams: Promise<{
    teamId?: string;
    q?: string;
    editionId?: string;
    schoolId?: string;
    requiredKind?: string;
    status?: string;
    anomaly?: string;
    done?: string;
  }>;
};

export default async function AdminDocumentsPage({ searchParams }: Props) {
  const query = await searchParams;
  const filters = parseReviewQueueFilters(query);
  const [{ actor }, pending, recent, options] = await Promise.all([
    requireStaffOrReviewer("/admin/documenti"),
    listPendingMedicalDocuments(medicalFiltersFromQueue(filters)),
    listRecentReviewedMedicalDocuments(),
    filterOptions(),
  ]);

  return (
    <AdminFrame path="/admin/documenti" allowReviewer actor={actor}>
      <PageHeader
        title={it.adminDocumentsTitle}
        description={it.adminDocumentsHelp}
        aside={
          pending[0] ? (
            <ButtonLink href={reviewDocumentHref(pending[0].id, filters)}>{it.adminReviewStart}</ButtonLink>
          ) : null
        }
      />
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
            <label className={fields.label} htmlFor="schoolId">
              {it.adminSchool}
            </label>
            <select id="schoolId" name="schoolId" className={fields.input} defaultValue={query.schoolId ?? ""}>
              <option value="">{it.filterAll}</option>
              {options.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
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
            <label className={fields.label} htmlFor="requiredKind">
              {it.adminFilterKind}
            </label>
            <select id="requiredKind" name="requiredKind" className={fields.input} defaultValue={query.requiredKind ?? ""}>
              <option value="">{it.filterAll}</option>
              {MEDICAL_CERTIFICATE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {medicalKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="status">
              {it.adminFilterStatus}
            </label>
            <select id="status" name="status" className={fields.input} defaultValue={query.status ?? ""}>
              <option value="">{it.filterAll}</option>
              <option value="PENDING_REVIEW">{it.statusDocumentPENDING_REVIEW}</option>
              <option value="PREVALIDATED">{it.statusDocumentPREVALIDATED}</option>
              <option value="APPROVED">{it.statusDocumentAPPROVED}</option>
              <option value="REJECTED">{it.statusDocumentREJECTED}</option>
              <option value="EXPIRED">{it.statusDocumentEXPIRED}</option>
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="anomaly">
              {it.adminFilterAnomaly}
            </label>
            <select id="anomaly" name="anomaly" className={fields.input} defaultValue={query.anomaly ?? ""}>
              <option value="">{it.filterAll}</option>
              {INSPECTION_ANOMALIES.map((code) => (
                <option key={code} value={code}>
                  {anomalyLabel(code)}
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
      {pending.length === 0 ? (
        <p className={styles.empty} role="status">
          {query.done === "1" ? it.adminDocumentsDone : it.adminDocumentsEmpty}
        </p>
      ) : (
        <ul className={styles.list}>
          {pending.map((document) => (
            <li key={document.id}>
              <Link href={reviewDocumentHref(document.id, filters)} className={styles.item}>
                <span>
                  <strong>{playerName(document)}</strong>
                  <span className={styles.meta}>
                    {document.registration.team.school.name} · {document.registration.team.name} ·{" "}
                    {medicalKindLabel(document.registration.team.edition.medicalCertificateKind)}
                  </span>
                </span>
                <StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {recent.length > 0 && !filters.status ? (
        <section>
          <h2 className={styles.sectionTitle}>{it.adminRecentDocuments}</h2>
          <ul className={styles.list}>
            {recent.map((document) => (
              <li key={document.id}>
                <Link href={`${reviewDocumentHref(document.id, filters)}`} className={styles.item}>
                  <span>
                    <strong>{playerName(document)}</strong>
                    <span className={styles.meta}>
                      {document.registration.team.school.name} · {document.registration.team.name} ·{" "}
                      {medicalKindLabel(document.registration.team.edition.medicalCertificateKind)}
                    </span>
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
