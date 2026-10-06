import { MEDICAL_RETENTION_DAYS } from "@/shared/config/app";
import { storageAdapter } from "@/shared/adapters";
import { prisma } from "@/shared/lib/prisma";
import { isMedicalBlobDueForPurge, isMedicalExpired } from "@/features/documents/domain/retention";

export async function purgeDocumentBlob(documentId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.blobPurgedAt) return { ok: true as const, skipped: true as const };
  await storageAdapter.delete({ key: document.storageKey });
  await prisma.document.update({
    where: { id: documentId },
    data: { blobPurgedAt: new Date() },
  });
  return { ok: true as const, skipped: false as const };
}

export async function expireOverdueMedicalDocuments(now = new Date()) {
  const result = await prisma.document.updateMany({
    where: {
      status: "APPROVED",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export async function purgeDueMedicalBlobs(now = new Date()) {
  const documents = await prisma.document.findMany({
    where: {
      blobPurgedAt: null,
      type: { code: "MEDICAL_CERTIFICATE" },
    },
    include: {
      registration: { include: { team: { include: { edition: { select: { endsAt: true } } } } } },
    },
  });
  let purged = 0;
  for (const document of documents) {
    if (
      !isMedicalBlobDueForPurge({
        blobPurgedAt: document.blobPurgedAt,
        status: document.status,
        registrationStatus: document.registration.status,
        editionEndsAt: document.registration.team.edition.endsAt,
        now,
        retentionDays: MEDICAL_RETENTION_DAYS,
      })
    ) {
      continue;
    }
    const result = await purgeDocumentBlob(document.id);
    if (result.ok && !result.skipped) purged += 1;
  }
  return purged;
}

export async function runMedicalRetention(now = new Date()) {
  const expired = await expireOverdueMedicalDocuments(now);
  const purged = await purgeDueMedicalBlobs(now);
  return { expired, purged };
}

export { isMedicalExpired };
