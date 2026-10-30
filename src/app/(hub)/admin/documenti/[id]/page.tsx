import { notFound } from "next/navigation";
import { getAdminDocumentView, listPendingMedicalQueue } from "@/features/documents/data/documents";
import { serializeAdminDocumentView, serializeReviewQueueItem } from "@/features/documents/domain/adminView";
import { MedicalReviewWorkspace } from "@/features/documents/ui/MedicalReviewWorkspace";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { authorize } from "@/shared/authz/authorize";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teamId?: string; q?: string }>;
};

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

  return (
    <AdminFrame path={`/admin/documenti/${id}`} allowReviewer actor={actor}>
      <MedicalReviewWorkspace
        initialDocument={serializeAdminDocumentView(document)}
        initialQueue={queue.map(serializeReviewQueueItem)}
        filters={filters}
        canReview={canReview}
        canOpen={canOpen}
      />
    </AdminFrame>
  );
}
