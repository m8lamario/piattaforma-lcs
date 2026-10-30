import type { ReviewQueueItem } from "@/features/documents/domain/reviewQueue";

export const adminDocumentSelect = {
  id: true,
  status: true,
  blobPurgedAt: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  playerProfile: { select: { firstName: true, lastName: true, birthDate: true, userId: true } },
  registration: {
    select: {
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          edition: { select: { name: true, competition: { select: { name: true } } } },
        },
      },
    },
  },
  reviews: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { decision: true, reason: true, createdAt: true },
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
      edition: { name: string; competition: { name: string } };
    };
  };
  reviews: Array<{ decision: string; reason: string | null; createdAt: Date }>;
};

export type SerializedAdminDocumentView = {
  id: string;
  status: string;
  blobPurgedAt: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
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
      edition: { name: string; competition: { name: string } };
    };
  };
  reviews: Array<{ decision: string; reason: string | null; createdAt: string }>;
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
    playerProfile: {
      firstName: document.playerProfile.firstName,
      lastName: document.playerProfile.lastName,
      birthDate: document.playerProfile.birthDate?.toISOString() ?? null,
      userId: document.playerProfile.userId,
    },
    registration: document.registration,
    reviews: document.reviews.map((review) => ({
      decision: review.decision,
      reason: review.reason,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export function serializeReviewQueueItem(item: ReviewQueueItem): SerializedReviewQueueItem {
  return { id: item.id, uploadedAt: item.uploadedAt.toISOString() };
}

export function parseReviewQueueItem(item: SerializedReviewQueueItem): ReviewQueueItem {
  return { id: item.id, uploadedAt: new Date(item.uploadedAt) };
}
