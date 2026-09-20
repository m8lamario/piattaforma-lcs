import { createHash, randomBytes } from "node:crypto";
import { MAX_UPLOAD_BYTES } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { storageAdapter } from "@/shared/adapters";
import { adminDocumentSelect } from "@/features/documents/domain/adminView";
import { sanitizeFilename, stubScan } from "@/features/documents/domain/filename";
import { declaredMimeMatches, detectAllowedMime } from "@/features/documents/domain/magic";

export async function ensureMedicalDocumentType() {
  return prisma.documentType.upsert({
    where: { code: "MEDICAL_CERTIFICATE" },
    update: {},
    create: {
      code: "MEDICAL_CERTIFICATE",
      name: "Certificato medico agonistico",
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
      registration: { include: { team: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function listPendingMedicalDocuments(filters: { teamId?: string; q?: string } = {}) {
  return prisma.document.findMany({
    where: {
      status: "PENDING_REVIEW",
      type: { code: "MEDICAL_CERTIFICATE" },
      registration: filters.teamId ? { teamId: filters.teamId } : undefined,
      playerProfile: filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    orderBy: { uploadedAt: "asc" },
    select: adminDocumentSelect,
  });
}

export async function listRecentReviewedMedicalDocuments() {
  return prisma.document.findMany({
    where: {
      type: { code: "MEDICAL_CERTIFICATE" },
      status: { in: ["APPROVED", "REJECTED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
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
        status: "PENDING_REVIEW",
      },
    });
    if (current) {
      await tx.document.update({
        where: { id: current.id },
        data: { status: "REPLACED", replacedById: created.id },
      });
    }
    return created;
  });

  return { ok: true as const, document };
}

export async function reviewMedicalDocument(input: {
  documentId: string;
  reviewerId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}) {
  if (input.decision === "REJECTED" && !input.reason?.trim()) {
    return { ok: false as const, reason: "reason_required" as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const document = await tx.document.findUnique({ where: { id: input.documentId } });
    if (!document || document.status !== "PENDING_REVIEW") {
      return null;
    }
    await tx.documentReview.create({
      data: {
        documentId: document.id,
        reviewerId: input.reviewerId,
        decision: input.decision,
        reason: input.reason?.trim() || null,
      },
    });
    return tx.document.update({
      where: { id: document.id },
      data: { status: input.decision },
    });
  });

  if (!updated) return { ok: false as const, reason: "missing" as const };
  return { ok: true as const, document: updated };
}
