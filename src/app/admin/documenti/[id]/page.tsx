import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDocumentView } from "@/features/documents/data/documents";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { ReviewForm } from "@/features/documents/ui/ReviewForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { Icon } from "@/shared/ui/Icon";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

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

export default async function AdminDocumentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const document = await getAdminDocumentView(id);
  if (!document || document.status === "REPLACED") notFound();

  const pending = document.status === "PENDING_REVIEW";
  const rejectReason = document.reviews[0]?.decision === "REJECTED" ? document.reviews[0].reason : null;

  return (
    <AdminFrame path={`/admin/documenti/${id}`}>
      <p>
        <Link href="/admin/documenti" className={styles.back}>
          <Icon name="back" size={16} />
          {it.adminBackToDocuments}
        </Link>
      </p>
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
          {document.originalFilename}
        </p>
        {rejectReason ? (
          <p className={styles.meta}>
            {it.medicalRejectReason}: {rejectReason}
          </p>
        ) : null}
        {pending ? (
          <ReviewForm documentId={document.id} reasonRequired={query.error === "reason"} />
        ) : (
          <>
            <p>{it.adminDocumentClosed}</p>
            <OpenDocumentButton documentId={document.id} />
          </>
        )}
      </section>
    </AdminFrame>
  );
}
