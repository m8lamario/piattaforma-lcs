import { notFound } from "next/navigation";
import {
  getAdminDocumentView,
  listPendingMedicalQueue,
  medicalFiltersFromQueue,
} from "@/features/documents/data/documents";
import { serializeAdminDocumentView, serializeReviewQueueItem } from "@/features/documents/domain/adminView";
import { parseReviewQueueFilters } from "@/features/documents/domain/reviewQueue";
import { MedicalReviewWorkspace } from "@/features/documents/ui/MedicalReviewWorkspace";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { authorize } from "@/shared/authz/authorize";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    teamId?: string;
    q?: string;
    editionId?: string;
    schoolId?: string;
    requiredKind?: string;
    status?: string;
    anomaly?: string;
    aiReview?: string;
  }>;
};

export default async function AdminDocumentDetailPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const filters = parseReviewQueueFilters(query);
  const [access, document, queue] = await Promise.all([
    requireStaffOrReviewer(`/admin/documenti/${id}`),
    getAdminDocumentView(id),
    listPendingMedicalQueue(medicalFiltersFromQueue(filters)),
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
