import type { MedicalCertificateKind, MedicalNameMatch, MedicalStampPresence } from "@generated/client";
import { certificateInspector } from "@/shared/adapters";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import {
  inspectCertificateText,
  statusFromAnomalies,
  type CertificateInspectionFacts,
  type InspectionAnomaly,
  type NameMatchResult,
  type StampPresence,
} from "@/features/documents/domain/certificatePolicy";
import { realignOpenDocument } from "@/features/documents/domain/inspection";

function toNameMatch(value: NameMatchResult): MedicalNameMatch {
  return value;
}

function toStamp(value: StampPresence): MedicalStampPresence {
  return value;
}

function failedFacts(): CertificateInspectionFacts {
  return {
    recognizedKind: null,
    issuedAt: null,
    expiresAt: null,
    nameMatch: "UNKNOWN",
    stampPresence: "UNKNOWN",
    anomalies: ["INSPECTOR_FAILED"],
  };
}

export async function inspectStoredCertificate(input: {
  documentId: string;
  body: Buffer;
  mimeType: string;
  requiredKind: MedicalCertificateKind;
  playerFirstName: string;
  playerLastName: string;
}) {
  await prisma.document.update({
    where: { id: input.documentId },
    data: { status: "PROCESSING" },
  });

  let adapter = certificateInspector.driver;
  let facts: CertificateInspectionFacts;

  try {
    const extracted = await certificateInspector.extractText({
      mimeType: input.mimeType,
      body: input.body,
    });
    adapter = extracted.adapter;
    if (extracted.reason === "image") {
      facts = {
        recognizedKind: null,
        issuedAt: null,
        expiresAt: null,
        nameMatch: "UNKNOWN",
        stampPresence: "UNKNOWN",
        anomalies: ["UNCLASSIFIED"],
      };
    } else if (extracted.reason === "failed") {
      facts = failedFacts();
    } else {
      facts = inspectCertificateText({
        text: extracted.text,
        requiredKind: input.requiredKind,
        playerFirstName: input.playerFirstName,
        playerLastName: input.playerLastName,
      });
    }
  } catch {
    adapter = `${adapter}-failed`;
    facts = failedFacts();
  }

  const status = statusFromAnomalies(facts.anomalies);
  await prisma.$transaction([
    prisma.medicalInspection.upsert({
      where: { documentId: input.documentId },
      create: {
        documentId: input.documentId,
        adapter,
        inspectedKind: input.requiredKind,
        recognizedKind: facts.recognizedKind,
        issuedAt: facts.issuedAt,
        expiresAt: facts.expiresAt,
        nameMatch: toNameMatch(facts.nameMatch),
        stampPresence: toStamp(facts.stampPresence),
        anomalies: facts.anomalies,
      },
      update: {
        adapter,
        inspectedKind: input.requiredKind,
        recognizedKind: facts.recognizedKind,
        issuedAt: facts.issuedAt,
        expiresAt: facts.expiresAt,
        nameMatch: toNameMatch(facts.nameMatch),
        stampPresence: toStamp(facts.stampPresence),
        anomalies: facts.anomalies,
        inspectedAt: new Date(),
      },
    }),
    prisma.document.update({
      where: { id: input.documentId },
      data: { status },
    }),
  ]);

  await writeAuditLog({
    actorKind: "SYSTEM",
    action: "DOCUMENT_INSPECT",
    entityType: "Document",
    entityId: input.documentId,
    metadata: {
      adapter,
      anomalies: facts.anomalies.join(","),
      status,
    },
  });

  return { status, anomalies: facts.anomalies as InspectionAnomaly[], adapter };
}

export async function realignOpenDocumentsForEdition(input: {
  editionId: string;
  requiredKindNow: MedicalCertificateKind;
}) {
  const documents = await prisma.document.findMany({
    where: {
      registration: { editionId: input.editionId },
      status: { in: ["UPLOADED", "PROCESSING", "PREVALIDATED", "PENDING_REVIEW"] },
    },
    select: {
      id: true,
      status: true,
      inspection: {
        select: { recognizedKind: true, anomalies: true },
      },
    },
  });

  for (const document of documents) {
    if (!document.inspection) continue;
    const next = realignOpenDocument({
      status: document.status,
      requiredKindNow: input.requiredKindNow,
      recognizedKind: document.inspection.recognizedKind,
      anomalies: document.inspection.anomalies as InspectionAnomaly[],
    });
    const statusChanged = next.status !== document.status;
    const anomaliesChanged = next.anomalies.join("\0") !== document.inspection.anomalies.join("\0");
    if (!statusChanged && !anomaliesChanged) {
      await prisma.medicalInspection.update({
        where: { documentId: document.id },
        data: { inspectedKind: input.requiredKindNow },
      });
      continue;
    }
    await prisma.$transaction([
      prisma.medicalInspection.update({
        where: { documentId: document.id },
        data: {
          inspectedKind: input.requiredKindNow,
          anomalies: next.anomalies,
        },
      }),
      prisma.document.update({
        where: { id: document.id },
        data: { status: next.status as "PENDING_REVIEW" | "PREVALIDATED" | "UPLOADED" | "PROCESSING" },
      }),
    ]);
  }
}
