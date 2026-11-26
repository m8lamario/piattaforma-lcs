import { createHash, randomBytes } from "node:crypto";
import type { DocumentStatus, MedicalCertificateKind } from "@generated/client";
import { MAX_UPLOAD_BYTES } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { storageAdapter } from "@/shared/adapters";
import { adminDocumentSelect } from "@/features/documents/domain/adminView";
import { sanitizeFilename, stubScan } from "@/features/documents/domain/filename";
import { declaredMimeMatches, detectAllowedMime } from "@/features/documents/domain/magic";
import {
  approvalReasonCode,
  isMedicalCertificateKind,
  parseMedicalCertificateKind,
  QUEUE_DOCUMENT_STATUSES,
  REVIEWABLE_DOCUMENT_STATUSES,
} from "@/features/documents/domain/medicalRequirement";
import { INSPECTION_ANOMALIES, type InspectionAnomaly } from "@/features/documents/domain/certificatePolicy";
import type { ReviewQueueFilters } from "@/features/documents/domain/reviewQueue";
import { inspectStoredCertificate } from "@/features/documents/data/inspect";

const REVIEW_STATUSES = [
  "UPLOADED",
  "PROCESSING",
  "PENDING_REVIEW",
  "PREVALIDATED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export function medicalFiltersFromQueue(filters: ReviewQueueFilters): MedicalDocumentFilters {
  const status = filters.status && (REVIEW_STATUSES as readonly string[]).includes(filters.status)
    ? (filters.status as DocumentStatus)
    : undefined;
  const requiredKind =
    filters.requiredKind && isMedicalCertificateKind(filters.requiredKind) ? filters.requiredKind : undefined;
  const anomaly =
    filters.anomaly && (INSPECTION_ANOMALIES as readonly string[]).includes(filters.anomaly)
      ? (filters.anomaly as InspectionAnomaly)
      : undefined;
  return {
    teamId: filters.teamId,
    q: filters.q,
    editionId: filters.editionId,
    schoolId: filters.schoolId,
    requiredKind,
    status,
    anomaly,
  };
}

export type MedicalDocumentFilters = {
  teamId?: string;
  q?: string;
  editionId?: string;
  schoolId?: string;
  requiredKind?: MedicalCertificateKind;
  status?: DocumentStatus;
  anomaly?: InspectionAnomaly;
};

export async function ensureMedicalDocumentType() {
  return prisma.documentType.upsert({
    where: { code: "MEDICAL_CERTIFICATE" },
    update: { maxSizeBytes: MAX_UPLOAD_BYTES, name: "Certificato medico" },
    create: {
      code: "MEDICAL_CERTIFICATE",
      name: "Certificato medico",
      allowedMime: ["application/pdf", "image/jpeg", "image/png"],
      maxSizeBytes: MAX_UPLOAD_BYTES,
      requiresExpiry: false,
    },
  });
}

export async function getCurrentMedicalDocument(registrationId: string) {
  return prisma.document.findFirst({
    where: {
      registrationId,
      status: { not: "REPLACED" },
      type: { code: "MEDICAL_CERTIFICATE" },
    },
    include: {
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
      type: true,
    },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function getDocumentById(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      type: true,
      playerProfile: { include: { user: true } },
      registration: {
        include: {
          team: { include: { school: true, edition: true } },
        },
      },
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
      inspection: true,
    },
  });
}

export async function listDocumentsForFileAccess(documentIds: string[]) {
  if (documentIds.length === 0) return [];
  return prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: {
      id: true,
      blobPurgedAt: true,
      playerProfile: { select: { userId: true } },
      registration: { select: { teamId: true } },
    },
  });
}

function medicalDocumentWhere(filters: MedicalDocumentFilters = {}) {
  const statuses = filters.status ? [filters.status] : [...QUEUE_DOCUMENT_STATUSES];
  const teamFilter =
    filters.schoolId || filters.requiredKind
      ? {
          schoolId: filters.schoolId,
          edition: filters.requiredKind
            ? { medicalCertificateKind: filters.requiredKind }
            : undefined,
        }
      : undefined;
  return {
    type: { code: "MEDICAL_CERTIFICATE" },
    status: { in: statuses },
    inspection: filters.anomaly ? { anomalies: { has: filters.anomaly } } : undefined,
    playerProfile: filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" as const } },
            { lastName: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : undefined,
    registration: {
      teamId: filters.teamId,
      editionId: filters.editionId,
      team: teamFilter,
    },
  };
}

const medicalDocumentListSelect = {
  id: true,
  status: true,
  playerProfile: { select: { firstName: true, lastName: true } },
  registration: {
    select: {
      team: {
        select: {
          name: true,
          school: { select: { name: true } },
          edition: { select: { medicalCertificateKind: true } },
        },
      },
    },
  },
} as const;

export async function listPendingMedicalDocuments(filters: MedicalDocumentFilters = {}) {
  return prisma.document.findMany({
    where: medicalDocumentWhere(filters),
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
    select: medicalDocumentListSelect,
  });
}

export async function listPendingMedicalQueue(filters: MedicalDocumentFilters = {}) {
  return prisma.document.findMany({
    where: medicalDocumentWhere({ ...filters, status: filters.status }),
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
    select: { id: true, uploadedAt: true },
  });
}

export async function listRecentReviewedMedicalDocuments() {
  return prisma.document.findMany({
    where: {
      type: { code: "MEDICAL_CERTIFICATE" },
      status: { in: ["APPROVED", "REJECTED", "EXPIRED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: medicalDocumentListSelect,
  });
}

export async function getAdminDocumentViews(documentIds: string[]) {
  const ids = [...new Set(documentIds)].slice(0, 8);
  if (ids.length === 0) return [];
  return prisma.document.findMany({
    where: { id: { in: ids } },
    select: adminDocumentSelect,
  });
}

export async function getAdminDocumentView(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    select: adminDocumentSelect,
  });
}

export async function storeMedicalCertificate(input: {
  registrationId: string;
  playerProfileId: string;
  fileName: string;
  declaredMime: string;
  body: Buffer;
  requiredKind: MedicalCertificateKind;
  playerFirstName: string;
  playerLastName: string;
}) {
  const detected = detectAllowedMime(input.body);
  if (!detected) {
    return { ok: false as const, reason: "mime" as const };
  }
  if (!declaredMimeMatches(detected, input.declaredMime)) {
    return { ok: false as const, reason: "mime" as const };
  }
  const type = await ensureMedicalDocumentType();
  if (input.body.length > type.maxSizeBytes) {
    return { ok: false as const, reason: "size" as const };
  }
  const scan = await stubScan({ body: input.body, mimeType: detected });
  if (!scan.ok) {
    return { ok: false as const, reason: "scan" as const };
  }

  const storageKey = `documents/${input.registrationId}/${randomBytes(16).toString("hex")}`;
  await storageAdapter.putPrivate({
    key: storageKey,
    body: input.body,
    mimeType: detected,
  });

  const checksum = createHash("sha256").update(input.body).digest("hex");
  const filename = sanitizeFilename(input.fileName);
  const requiredKind = parseMedicalCertificateKind(input.requiredKind);

  const document = await prisma.$transaction(async (tx) => {
    const current = await tx.document.findFirst({
      where: {
        registrationId: input.registrationId,
        status: { not: "REPLACED" },
        typeId: type.id,
      },
    });
    const created = await tx.document.create({
      data: {
        registrationId: input.registrationId,
        playerProfileId: input.playerProfileId,
        typeId: type.id,
        storageKey,
        mimeType: detected,
        sizeBytes: input.body.length,
        checksumSha256: checksum,
        originalFilename: filename,
        status: "UPLOADED",
        requiredKindAtUpload: requiredKind,
      },
    });
    if (current) {
      await tx.document.update({
        where: { id: current.id },
        data: { status: "REPLACED", replacedById: created.id },
      });
    }
    return { created, replacedId: current?.id ?? null };
  });

  if (document.replacedId) {
    const { purgeDocumentBlob } = await import("@/features/documents/data/retention");
    await purgeDocumentBlob(document.replacedId);
  }

  try {
    await inspectStoredCertificate({
      documentId: document.created.id,
      body: input.body,
      mimeType: detected,
      requiredKind,
      playerFirstName: input.playerFirstName,
      playerLastName: input.playerLastName,
    });
  } catch {
    await prisma.document.update({
      where: { id: document.created.id },
      data: { status: "PENDING_REVIEW" },
    });
    await prisma.medicalInspection.upsert({
      where: { documentId: document.created.id },
      create: {
        documentId: document.created.id,
        adapter: "failed",
        inspectedKind: requiredKind,
        nameMatch: "UNKNOWN",
        stampPresence: "UNKNOWN",
        anomalies: ["INSPECTOR_FAILED"],
      },
      update: {
        adapter: "failed",
        inspectedKind: requiredKind,
        anomalies: ["INSPECTOR_FAILED"],
        inspectedAt: new Date(),
      },
    });
  }

  const refreshed = await prisma.document.findUnique({ where: { id: document.created.id } });
  return { ok: true as const, document: refreshed ?? document.created };
}

export async function reviewMedicalDocument(input: {
  documentId: string;
  reviewerId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  expiresAt?: Date | null;
  requiredKind: MedicalCertificateKind;
}) {
  if (input.decision === "REJECTED" && !input.reason?.trim()) {
    return { ok: false as const, reason: "reason_required" as const };
  }
  if (input.decision === "APPROVED") {
    const today = new Date();
    const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    if (!input.expiresAt || input.expiresAt.getTime() <= startOfToday) {
      return { ok: false as const, reason: "expiry_required" as const };
    }
  }

  const requiredKind = parseMedicalCertificateKind(input.requiredKind);
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: { id: input.documentId, status: { in: [...REVIEWABLE_DOCUMENT_STATUSES] } },
      data: {
        status: input.decision,
        expiresAt: input.decision === "APPROVED" ? input.expiresAt : null,
      },
    });
    if (claimed.count !== 1) return null;
    await tx.documentReview.create({
      data: {
        documentId: input.documentId,
        reviewerId: input.reviewerId,
        decision: input.decision,
        requiredKindAtDecision: requiredKind,
        reason:
          input.decision === "APPROVED" ? approvalReasonCode(requiredKind) : input.reason?.trim() || null,
      },
    });
    return tx.document.findUnique({ where: { id: input.documentId } });
  });

  if (!updated) return { ok: false as const, reason: "not_pending" as const };
  return { ok: true as const, document: updated };
}
