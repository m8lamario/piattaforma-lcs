import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDocumentView } from "@/features/documents/data/documents";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { ReviewForm } from "@/features/documents/ui/ReviewForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { Icon } from "@/shared/ui/Icon";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { auth } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
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

export default async function AdminDocumentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const document = await getAdminDocumentView(id);
  if (!document || document.status === "REPLACED") notFound();

  const session = await auth();
  const actor = session?.user?.id ? await getActorByUserId(session.user.id) : null;
  const resource = {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  };
  const canReview = actor ? authorize(actor, "document:review", resource).allow : false;
  const canOpen = actor ? authorize(actor, "document:read_file", resource).allow && !document.blobPurgedAt : false;

  const pending = document.status === "PENDING_REVIEW";
  const rejectReason = document.reviews[0]?.decision === "REJECTED" ? document.reviews[0].reason : null;

  return (
    <AdminFrame path={`/admin/documenti/${id}`} allowReviewer>
      <p>
        <Link href="/admin/documenti" className={styles.back}>
          <Icon name="back" size={16} />
          {it.adminBackToDocuments}
        </Link>
      </p>

      <div className={styles.reviewGrid}>
        <section className={styles.card}>
          <PageHeader
            title={it.adminDocumentTitle}
            aside={<StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>}
          />
          <p className={styles.meta}>
            {it.adminPlayer}:{" "}
            <strong>
              {document.playerProfile.firstName} {document.playerProfile.lastName}
            </strong>
          </p>
          <p className={styles.meta}>
            {it.adminTeam}: <strong>{document.registration.team.name}</strong>
          </p>
          <p className={styles.meta} role="status">
            File: <strong>{document.originalFilename}</strong>
          </p>
          {rejectReason ? (
            <p className={styles.meta}>
              {it.medicalRejectReason}: {rejectReason}
            </p>
          ) : null}

          {!pending && canOpen ? (
            <div style={{ marginTop: "var(--space-4)" }}>
              <p>{it.adminDocumentClosed}</p>
              <OpenDocumentButton documentId={document.id} />
            </div>
          ) : null}
        </section>

        {pending && canReview ? (
          <aside className={styles.sideCol}>
            <div className={styles.reviewCard}>
              <ReviewForm
                documentId={document.id}
                reasonRequired={query.error === "reason"}
                expiryRequired={query.error === "expiry"}
                canOpenFile={canOpen}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </AdminFrame>
  );
}
