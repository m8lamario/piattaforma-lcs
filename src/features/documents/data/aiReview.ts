import {
  aiApproveBlockedByKindChange,
  aiExpiryRule,
  aiKindLabel,
  auditTextSnippet,
  canRevokeAiApproval,
  clampAiListLimit,
  decodeAiListCursor,
  encodeAiListCursor,
  isAiActionable,
  nonCompetitiveExpiryFromVisit,
  parseAiApproveDates,
  parseAiReviewText,
} from "@/features/documents/domain/aiReview";
import { REVIEWABLE_DOCUMENT_STATUSES } from "@/features/documents/domain/medicalRequirement";
import { formatDateOnly } from "@/features/players/domain/dates";
import { createNotification } from "@/features/notifications/data/notifications";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { prisma } from "@/shared/lib/prisma";
import { writeAuditLog } from "@/shared/lib/audit";
import { it } from "@/shared/i18n/it";
import { createMcpFileToken, mcpFileTtlSeconds } from "@/features/mcp/fileToken";
import { appOrigin } from "@/shared/config/app";

export type RequestTrace = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const aiListSelect = {
  id: true,
  playerProfileId: true,
  uploadedAt: true,
  requiredKindAtUpload: true,
  playerProfile: { select: { firstName: true, lastName: true, birthDate: true } },
  registration: { select: { team: { select: { name: true } } } },
  inspection: { select: { issuedAt: true, expiresAt: true } },
} as const;

function aiQueueWhere(cursor?: { uploadedAt: Date; id: string }) {
  return {
    type: { code: "MEDICAL_CERTIFICATE" },
    status: { in: [...REVIEWABLE_DOCUMENT_STATUSES] },
    aiReviewState: "NONE" as const,
    blobPurgedAt: null,
    ...(cursor
      ? {
          OR: [
            { uploadedAt: { gt: cursor.uploadedAt } },
            { uploadedAt: cursor.uploadedAt, id: { gt: cursor.id } },
          ],
        }
      : {}),
  };
}

export async function listPendingCertificatesForAi(input: {
  limit?: number;
  cursor?: string;
  trace?: RequestTrace;
}) {
  const parsedCursor = input.cursor ? decodeAiListCursor(input.cursor) : undefined;
  if (input.cursor && !parsedCursor) {
    return { ok: false as const, reason: "invalid_cursor" as const };
  }
  const take = clampAiListLimit(input.limit);
  const rows = await prisma.document.findMany({
    where: aiQueueWhere(parsedCursor ?? undefined),
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
    take: take + 1,
    select: aiListSelect,
  });
  const page = rows.slice(0, take);
  const next = rows[take];
  await writeAuditLog({
    actorKind: "SYSTEM",
    actorRole: "MCP_REVIEW",
    action: "DOCUMENT_AI_LIST",
    entityType: "Document",
    entityId: page[0]?.id ?? "queue",
    metadata: { count: page.length, hasMore: Boolean(next) },
    ipAddress: input.trace?.ipAddress,
    userAgent: input.trace?.userAgent,
  });
  return {
    ok: true as const,
    certificates: page.map((row) => ({
      certificate_id: row.id,
      player_id: row.playerProfileId,
      nome: row.playerProfile.firstName,
      cognome: row.playerProfile.lastName,
      data_nascita: row.playerProfile.birthDate ? formatDateOnly(row.playerProfile.birthDate) : null,
      squadra: row.registration.team.name,
      tipo_richiesto: aiKindLabel(row.requiredKindAtUpload),
      regola_scadenza: aiExpiryRule(row.requiredKindAtUpload),
      data_visita_letta: row.inspection?.issuedAt ? formatDateOnly(row.inspection.issuedAt) : null,
      data_scadenza_letta: row.inspection?.expiresAt ? formatDateOnly(row.inspection.expiresAt) : null,
      data_scadenza_proposta:
        row.requiredKindAtUpload === "NON_COMPETITIVE" && row.inspection?.issuedAt
          ? formatDateOnly(nonCompetitiveExpiryFromVisit(row.inspection.issuedAt))
          : null,
      data_caricamento: row.uploadedAt.toISOString(),
    })),
    next_cursor: next ? encodeAiListCursor({ uploadedAt: next.uploadedAt, id: next.id }) : null,
  };
}

export async function getAiCertificateFile(input: {
  certificateId: string;
  trace?: RequestTrace;
}) {
  const document = await prisma.document.findUnique({
    where: { id: input.certificateId },
    select: {
      id: true,
      status: true,
      aiReviewState: true,
      blobPurgedAt: true,
      mimeType: true,
      originalFilename: true,
      requiredKindAtUpload: true,
      type: { select: { code: true } },
      inspection: { select: { issuedAt: true, expiresAt: true } },
    },
  });
  if (
    !document ||
    !isAiActionable({
      typeCode: document.type.code,
      status: document.status,
      aiReviewState: document.aiReviewState,
      blobPurgedAt: document.blobPurgedAt,
    })
  ) {
    return { ok: false as const, reason: "not_actionable" as const };
  }
  const expiresAtUnix = Math.floor(Date.now() / 1000) + mcpFileTtlSeconds();
  const token = createMcpFileToken({ documentId: document.id, expiresAtUnix });
  await writeAuditLog({
    actorKind: "SYSTEM",
    actorRole: "MCP_REVIEW",
    action: "DOCUMENT_AI_VIEW",
    entityType: "Document",
    entityId: document.id,
    metadata: { issued: true },
    ipAddress: input.trace?.ipAddress,
    userAgent: input.trace?.userAgent,
  });
  return {
    ok: true as const,
    mime_type: document.mimeType,
    filename: document.originalFilename,
    tipo_richiesto: aiKindLabel(document.requiredKindAtUpload),
    regola_scadenza: aiExpiryRule(document.requiredKindAtUpload),
    data_visita_letta: document.inspection?.issuedAt ? formatDateOnly(document.inspection.issuedAt) : null,
    data_scadenza_letta: document.inspection?.expiresAt ? formatDateOnly(document.inspection.expiresAt) : null,
    data_scadenza_proposta:
      document.requiredKindAtUpload === "NON_COMPETITIVE" && document.inspection?.issuedAt
        ? formatDateOnly(nonCompetitiveExpiryFromVisit(document.inspection.issuedAt))
        : null,
    expires_at: new Date(expiresAtUnix * 1000).toISOString(),
    url: `${appOrigin()}/api/mcp/file?token=${encodeURIComponent(token)}`,
  };
}

export async function loadAiFileDocument(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      status: true,
      aiReviewState: true,
      blobPurgedAt: true,
      mimeType: true,
      originalFilename: true,
      storageKey: true,
      type: { select: { code: true } },
    },
  });
}

async function persistPlayerWorkspace(userId: string) {
  const workspace = await loadPlayerWorkspace(userId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }
}

export async function approveCertificateByAi(input: {
  certificateId: string;
  note: string;
  dataRilascio: string;
  dataScadenza?: string;
  trace?: RequestTrace;
}) {
  const note = parseAiReviewText(input.note);
  if (!note.ok) return { ok: false as const, reason: note.reason };

  const current = await prisma.document.findUnique({
    where: { id: input.certificateId },
    select: {
      id: true,
      status: true,
      aiReviewState: true,
      blobPurgedAt: true,
      requiredKindAtUpload: true,
      type: { select: { code: true } },
      playerProfile: { select: { userId: true } },
      registration: { select: { team: { select: { edition: { select: { medicalCertificateKind: true } } } } } },
    },
  });
  if (
    !current ||
    !isAiActionable({
      typeCode: current.type.code,
      status: current.status,
      aiReviewState: current.aiReviewState,
      blobPurgedAt: current.blobPurgedAt,
    })
  ) {
    return { ok: false as const, reason: "not_actionable" as const };
  }
  const requiredKind = current.registration.team.edition.medicalCertificateKind;
  if (aiApproveBlockedByKindChange(current.requiredKindAtUpload, requiredKind)) {
    return { ok: false as const, reason: "kind_changed" as const };
  }
  const dates = parseAiApproveDates({
    dataRilascio: input.dataRilascio,
    dataScadenza: input.dataScadenza,
    requiredKind,
  });
  if (!dates.ok) return { ok: false as const, reason: dates.reason };

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: {
        id: input.certificateId,
        status: { in: [...REVIEWABLE_DOCUMENT_STATUSES] },
        aiReviewState: "NONE",
        blobPurgedAt: null,
      },
      data: {
        status: "APPROVED",
        expiresAt: dates.expiresAt,
        aiReviewState: "APPROVED",
        aiFlagReason: null,
      },
    });
    if (claimed.count !== 1) return null;
    await tx.documentReview.create({
      data: {
        documentId: input.certificateId,
        actorKind: "SYSTEM",
        decision: "APPROVED",
        note: note.text,
        issuedAt: dates.issuedAt,
        requiredKindAtDecision: requiredKind,
      },
    });
    return tx.document.findUnique({ where: { id: input.certificateId } });
  });

  if (!updated) return { ok: false as const, reason: "not_actionable" as const };

  await persistPlayerWorkspace(current.playerProfile.userId);
  await createNotification({
    userId: current.playerProfile.userId,
    type: "DOCUMENT_APPROVED",
    title: "Certificato approvato",
    body: "L’organizzazione ha approvato il certificato. Continua l’iscrizione dalla tua area.",
  });
  await writeAuditLog({
    actorKind: "SYSTEM",
    actorRole: "MCP_REVIEW",
    action: "DOCUMENT_AI_APPROVE",
    entityType: "Document",
    entityId: input.certificateId,
    metadata: {
      note: auditTextSnippet(note.text),
      data_rilascio: formatDateOnly(dates.issuedAt),
      data_scadenza: formatDateOnly(dates.expiresAt),
      expiryComputed: dates.expiryComputed,
    },
    ipAddress: input.trace?.ipAddress,
    userAgent: input.trace?.userAgent,
  });
  return {
    ok: true as const,
    documentId: updated.id,
    issuedAt: dates.issuedAt,
    expiresAt: dates.expiresAt,
    expiryComputed: dates.expiryComputed,
  };
}

export async function flagCertificateByAi(input: {
  certificateId: string;
  motivo: string;
  trace?: RequestTrace;
}) {
  const motivo = parseAiReviewText(input.motivo);
  if (!motivo.ok) return { ok: false as const, reason: motivo.reason };

  const current = await prisma.document.findUnique({
    where: { id: input.certificateId },
    select: {
      id: true,
      status: true,
      aiReviewState: true,
      blobPurgedAt: true,
      type: { select: { code: true } },
    },
  });
  if (
    !current ||
    !isAiActionable({
      typeCode: current.type.code,
      status: current.status,
      aiReviewState: current.aiReviewState,
      blobPurgedAt: current.blobPurgedAt,
    })
  ) {
    return { ok: false as const, reason: "not_actionable" as const };
  }

  const claimed = await prisma.document.updateMany({
    where: {
      id: input.certificateId,
      status: { in: [...REVIEWABLE_DOCUMENT_STATUSES] },
      aiReviewState: "NONE",
      blobPurgedAt: null,
    },
    data: {
      aiReviewState: "FLAGGED",
      aiFlagReason: motivo.text,
    },
  });
  if (claimed.count !== 1) return { ok: false as const, reason: "not_actionable" as const };

  await writeAuditLog({
    actorKind: "SYSTEM",
    actorRole: "MCP_REVIEW",
    action: "DOCUMENT_AI_FLAG",
    entityType: "Document",
    entityId: input.certificateId,
    metadata: { motivo: auditTextSnippet(motivo.text) },
    ipAddress: input.trace?.ipAddress,
    userAgent: input.trace?.userAgent,
  });
  return { ok: true as const, documentId: input.certificateId };
}

export async function revokeAiCertificateApproval(input: {
  documentId: string;
  actorUserId: string;
  trace?: RequestTrace;
}) {
  const current = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: {
      id: true,
      status: true,
      aiReviewState: true,
      playerProfile: { select: { userId: true } },
    },
  });
  if (!current || !canRevokeAiApproval(current)) {
    return { ok: false as const, reason: "not_revocable" as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: { id: input.documentId, status: "APPROVED", aiReviewState: "APPROVED" },
      data: {
        status: "PENDING_REVIEW",
        expiresAt: null,
        aiReviewState: "RETURNED",
      },
    });
    if (claimed.count !== 1) return null;
    const review = await tx.documentReview.findFirst({
      where: {
        documentId: input.documentId,
        actorKind: "SYSTEM",
        decision: "APPROVED",
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!review) return null;
    await tx.documentReview.update({
      where: { id: review.id },
      data: { revokedAt: new Date(), revokedById: input.actorUserId },
    });
    return tx.document.findUnique({ where: { id: input.documentId } });
  });

  if (!updated) return { ok: false as const, reason: "not_revocable" as const };

  await persistPlayerWorkspace(current.playerProfile.userId);
  await prisma.notification.create({
    data: {
      userId: current.playerProfile.userId,
      type: "DOCUMENT_REVIEW_REOPENED",
      title: it.notifyMedicalReopenedTitle,
      body: it.notifyMedicalReopenedBody,
    },
  });
  await writeAuditLog({
    actorUserId: input.actorUserId,
    actorKind: "USER",
    action: "DOCUMENT_AI_APPROVAL_REVOKED",
    entityType: "Document",
    entityId: input.documentId,
    ipAddress: input.trace?.ipAddress,
    userAgent: input.trace?.userAgent,
  });
  return { ok: true as const, playerUserId: current.playerProfile.userId };
}
