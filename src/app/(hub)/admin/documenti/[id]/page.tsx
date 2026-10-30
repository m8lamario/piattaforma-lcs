import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDocumentView, listPendingMedicalQueue } from "@/features/documents/data/documents";
import { reviewDocumentHref, reviewQueuePosition, reviewQueueQuery } from "@/features/documents/domain/reviewQueue";
import { CertificateViewer } from "@/features/documents/ui/CertificateViewer";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { ReviewForm } from "@/features/documents/ui/ReviewForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { authorize } from "@/shared/authz/authorize";
import { Icon } from "@/shared/ui/Icon";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teamId?: string; q?: string }>;
};

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  if (status === "EXPIRED") return it.statusDocumentEXPIRED;
  return it.statusDocumentPENDING_REVIEW;
}

function statusTone(status: string): StatusTone {
  if (status === "APPROVED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  return mimeType;
}

function romeDate(value: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function birthLabel(value: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", dateStyle: "short" }).format(value);
}

export default async function AdminDocumentDetailPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const filters = { teamId: query.teamId?.trim() || undefined, q: query.q?.trim().slice(0, 80) || undefined };
  const [access, document, queue] = await Promise.all([
    requireStaffOrReviewer(`/admin/documenti/${id}`),
    getAdminDocumentView(id),
    listPendingMedicalQueue(filters),
  ]);
  if (!document || document.status === "REPLACED") notFound();

  const actor = access.actor;
  const resource = {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  };
  const canReview = authorize(actor, "document:review", resource).allow;
  const canOpen = authorize(actor, "document:read_file", resource).allow && !document.blobPurgedAt;
  const pending = document.status === "PENDING_REVIEW";
  const position = reviewQueuePosition(queue, document.id);
  const rejectReason = document.reviews[0]?.decision === "REJECTED" ? document.reviews[0].reason : null;
  const team = document.registration.team;
  const editionLabel = `${team.edition.competition.name} · ${team.edition.name}`;

  return (
    <AdminFrame path={`/admin/documenti/${id}`} allowReviewer actor={actor}>
      <p>
        <Link href={`/admin/documenti${reviewQueueQuery(filters)}`} className={styles.back}>
          <Icon name="back" size={16} />
          {it.adminBackToDocuments}
        </Link>
      </p>

      <div className={styles.reviewGrid}>
        <section className={styles.viewerCol} aria-label={it.adminDocumentTitle}>
          <CertificateViewer documentId={document.id} mimeType={document.mimeType} available={canOpen} />
        </section>

        <aside className={styles.sideCol}>
          <div className={styles.reviewCard}>
            <div className={styles.nav}>
              {position.prevId ? (
                <ButtonLink href={reviewDocumentHref(position.prevId, filters)} variant="secondary">
                  {it.adminReviewPrev}
                </ButtonLink>
              ) : (
                <Button type="button" variant="secondary" disabled>
                  {it.adminReviewPrev}
                </Button>
              )}
              {position.nextId ? (
                <ButtonLink href={reviewDocumentHref(position.nextId, filters)} variant="secondary">
                  {it.adminReviewNext}
                </ButtonLink>
              ) : (
                <Button type="button" variant="secondary" disabled>
                  {it.adminReviewNext}
                </Button>
              )}
            </div>
            <p className={styles.progress} role="status">
              {position.inQueue && position.position != null
                ? `${it.adminReviewDocument} ${position.position} ${it.adminReviewOf} ${position.total}`
                : it.adminReviewLeftQueue}
              {" · "}
              {it.adminReviewRemaining}: {position.remaining}
            </p>

            <div className={styles.identity}>
              <h1>
                {document.playerProfile.firstName} {document.playerProfile.lastName}
              </h1>
              <StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>
            </div>
            <p className={styles.meta}>
              {it.birthDate}: <strong>{document.playerProfile.birthDate ? birthLabel(document.playerProfile.birthDate) : "—"}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminTeam}: <strong>{team.name}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminEdition}: <strong>{editionLabel}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminReviewFile}: <strong>{fileKind(document.mimeType)}</strong>
              {" · "}
              {document.originalFilename}
              {" · "}
              {fileSize(document.sizeBytes)}
            </p>
            <p className={styles.meta}>
              {it.adminReviewUploaded}: <strong>{romeDate(document.uploadedAt)}</strong>
            </p>
            {rejectReason ? (
              <p className={styles.meta}>
                {it.medicalRejectReason}: {rejectReason}
              </p>
            ) : null}

            {pending && canReview ? (
              <ReviewForm documentId={document.id} teamId={filters.teamId} queueQ={filters.q} />
            ) : (
              <div className={styles.closed}>
                {!pending ? <p>{it.adminDocumentClosed}</p> : null}
                {canOpen ? <OpenDocumentButton documentId={document.id} /> : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
