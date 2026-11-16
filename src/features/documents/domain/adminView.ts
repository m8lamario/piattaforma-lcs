import type { ReviewQueueItem } from "@/features/documents/domain/reviewQueue";
import type { MedicalCertificateKind } from "./medicalRequirement";

export const adminDocumentSelect = {
  id: true,
  status: true,
  blobPurgedAt: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  expiresAt: true,
  requiredKindAtUpload: true,
  playerProfile: { select: { firstName: true, lastName: true, birthDate: true, userId: true } },
  registration: {
    select: {
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          school: { select: { id: true, name: true } },
          edition: {
            select: {
              id: true,
              name: true,
              medicalCertificateKind: true,
              competition: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  inspection: {
    select: {
      inspectedKind: true,
      recognizedKind: true,
      issuedAt: true,
      expiresAt: true,
      nameMatch: true,
      stampPresence: true,
      anomalies: true,
      adapter: true,
      inspectedAt: true,
    },
  },
  reviews: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { decision: true, reason: true, createdAt: true, requiredKindAtDecision: true },
  },
};

export type AdminDocumentViewRecord = {
  id: string;
  status: string;
  blobPurgedAt: Date | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  expiresAt: Date | null;
  requiredKindAtUpload: MedicalCertificateKind;
  playerProfile: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    userId: string;
  };
  registration: {
    teamId: string;
    team: {
      id: string;
      name: string;
      school: { id: string; name: string };
      edition: {
        id: string;
        name: string;
        medicalCertificateKind: MedicalCertificateKind;
        competition: { name: string };
      };
    };
  };
  inspection: {
    inspectedKind: MedicalCertificateKind;
    recognizedKind: MedicalCertificateKind | null;
    issuedAt: Date | null;
    expiresAt: Date | null;
    nameMatch: string;
    stampPresence: string;
    anomalies: string[];
    adapter: string;
    inspectedAt: Date;
  } | null;
  reviews: Array<{
    decision: string;
    reason: string | null;
    createdAt: Date;
    requiredKindAtDecision: MedicalCertificateKind | null;
  }>;
};

export type SerializedAdminDocumentView = {
  id: string;
  status: string;
  blobPurgedAt: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  expiresAt: string | null;
  requiredKindAtUpload: MedicalCertificateKind;
  playerProfile: {
    firstName: string;
    lastName: string;
    birthDate: string | null;
    userId: string;
  };
  registration: {
    teamId: string;
    team: {
      id: string;
      name: string;
      school: { id: string; name: string };
      edition: {
        id: string;
        name: string;
        medicalCertificateKind: MedicalCertificateKind;
        competition: { name: string };
      };
    };
  };
  inspection: {
    inspectedKind: MedicalCertificateKind;
    recognizedKind: MedicalCertificateKind | null;
    issuedAt: string | null;
    expiresAt: string | null;
    nameMatch: string;
    stampPresence: string;
    anomalies: string[];
    adapter: string;
    inspectedAt: string;
  } | null;
  reviews: Array<{
    decision: string;
    reason: string | null;
    createdAt: string;
    requiredKindAtDecision: MedicalCertificateKind | null;
  }>;
};

export type SerializedReviewQueueItem = { id: string; uploadedAt: string };

export function serializeAdminDocumentView(document: AdminDocumentViewRecord): SerializedAdminDocumentView {
  return {
    id: document.id,
    status: document.status,
    blobPurgedAt: document.blobPurgedAt?.toISOString() ?? null,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt.toISOString(),
    expiresAt: document.expiresAt?.toISOString() ?? null,
    requiredKindAtUpload: document.requiredKindAtUpload,
    playerProfile: {
      firstName: document.playerProfile.firstName,
      lastName: document.playerProfile.lastName,
      birthDate: document.playerProfile.birthDate?.toISOString() ?? null,
      userId: document.playerProfile.userId,
    },
    registration: document.registration,
    inspection: document.inspection
      ? {
          inspectedKind: document.inspection.inspectedKind,
          recognizedKind: document.inspection.recognizedKind,
          issuedAt: document.inspection.issuedAt?.toISOString() ?? null,
          expiresAt: document.inspection.expiresAt?.toISOString() ?? null,
          nameMatch: document.inspection.nameMatch,
          stampPresence: document.inspection.stampPresence,
          anomalies: document.inspection.anomalies,
          adapter: document.inspection.adapter,
          inspectedAt: document.inspection.inspectedAt.toISOString(),
        }
      : null,
    reviews: document.reviews.map((review) => ({
      decision: review.decision,
      reason: review.reason,
      createdAt: review.createdAt.toISOString(),
      requiredKindAtDecision: review.requiredKindAtDecision,
    })),
  };
}

export function serializeReviewQueueItem(item: ReviewQueueItem): SerializedReviewQueueItem {
  return { id: item.id, uploadedAt: item.uploadedAt.toISOString() };
}

export function parseReviewQueueItem(item: SerializedReviewQueueItem): ReviewQueueItem {
  return { id: item.id, uploadedAt: new Date(item.uploadedAt) };
}

export function documentKindMismatch(document: {
  requiredKindAtUpload: MedicalCertificateKind;
  registration: { team: { edition: { medicalCertificateKind: MedicalCertificateKind } } };
  inspection: { recognizedKind: MedicalCertificateKind | null; anomalies: string[] } | null;
}) {
  const requiredNow = document.registration.team.edition.medicalCertificateKind;
  if (document.requiredKindAtUpload !== requiredNow) return true;
  if (document.inspection?.recognizedKind && document.inspection.recognizedKind !== requiredNow) return true;
  return Boolean(document.inspection?.anomalies.includes("KIND_MISMATCH"));
}
