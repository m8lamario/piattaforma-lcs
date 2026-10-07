import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolAccessRequest } from "@/features/school-access/data/requests";
import { AdminRequestActions } from "@/features/school-access/ui/AdminRequestActions";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

const ROLE_COPY = {
  INSTITUTE_REPRESENTATIVE: it.schoolAccessRoleInstitute,
  TEACHER: it.schoolAccessRoleTeacher,
  OTHER: it.schoolAccessRoleOther,
} as const;

const STATUS_COPY = {
  PENDING: it.schoolAccessStatusPending,
  APPROVED: it.schoolAccessStatusApproved,
  REJECTED: it.schoolAccessStatusRejected,
} as const;

function statusTone(status: keyof typeof STATUS_COPY): StatusTone {
  if (status === "APPROVED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

function formatWhen(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toISOString().replace("T", " ").slice(0, 16);
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminSchoolRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const request = await getSchoolAccessRequest(id);
  if (!request) notFound();

  const canResend = request.status === "APPROVED" && !request.activatedAt && !request.user?.passwordHash;

  return (
    <AdminFrame path={`/admin/richieste/${id}`}>
      <PageHeader
        kicker={`${request.edition.competition.name} · ${request.edition.name}`}
        title={request.schoolName}
        description={it.adminSchoolRequestDetail}
        aside={<StatusChip tone={statusTone(request.status)}>{STATUS_COPY[request.status]}</StatusChip>}
      />

      <div className={styles.twoColGrid}>
        <section className={styles.colMain}>
          <div className={styles.sideCard}>
            <p className={styles.meta}>
              {it.schoolAccessRequester}:{" "}
              <strong>
                {request.firstName} {request.lastName}
              </strong>
            </p>
            <p className={styles.meta}>
              {it.email}: <strong>{request.email}</strong>
            </p>
            <p className={styles.meta}>
              {it.schoolAccessPhone}: <strong>{request.phone}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminSchool}:{" "}
              <strong>
                {request.schoolName}
                {request.city ? ` · ${request.city}` : ""}
              </strong>
            </p>
            <p className={styles.meta}>
              {it.schoolAccessRole}: <strong>{ROLE_COPY[request.requesterRole]}</strong>
            </p>
            {request.institutionalEmail ? (
              <p className={styles.meta}>
                {it.schoolAccessInstitutionalEmail}: <strong>{request.institutionalEmail}</strong>
              </p>
            ) : null}
            <p className={styles.meta}>
              {it.schoolAccessCompetition}:{" "}
              <strong>
                {request.edition.competition.name} · {request.edition.name}
              </strong>
            </p>
            {request.reviewedBy ? (
              <p className={styles.meta}>
                {it.schoolAccessReviewedBy}: <strong>{request.reviewedBy.email}</strong>
              </p>
            ) : null}
            {request.reviewedAt ? (
              <p className={styles.meta}>
                {it.schoolAccessReviewedAt}: <strong>{formatWhen(request.reviewedAt)}</strong>
              </p>
            ) : null}
            {request.rejectionReason ? (
              <p className={styles.meta}>
                {it.schoolAccessRejectionReason}: <strong>{request.rejectionReason}</strong>
              </p>
            ) : null}
            {request.activatedAt ? (
              <p className={styles.meta}>
                {it.schoolAccessActivatedAt}: <strong>{formatWhen(request.activatedAt)}</strong>
              </p>
            ) : null}
            {request.team ? (
              <p className={styles.meta}>
                <Link href={`/admin/squadre/${request.team.id}`}>{request.team.name}</Link>
              </p>
            ) : null}
          </div>
        </section>

        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <AdminRequestActions id={request.id} status={request.status} canResend={canResend} />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
