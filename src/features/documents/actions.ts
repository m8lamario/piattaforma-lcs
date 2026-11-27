"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getAdminDocumentViews,
  getCurrentMedicalDocument,
  getDocumentById,
  listDocumentsForFileAccess,
  listPendingMedicalQueue,
  medicalFiltersFromQueue,
  reviewMedicalDocument,
  storeMedicalCertificate,
} from "@/features/documents/data/documents";
import { revokeAiCertificateApproval } from "@/features/documents/data/aiReview";
import { notifyCertificateUploaded } from "@/features/mcp/webhook";
import { canRevokeAiApproval } from "@/features/documents/domain/aiReview";
import {
  nextPendingAfter,
  parseReviewQueueFilters,
  reviewDocumentHref,
  reviewDoneHref,
} from "@/features/documents/domain/reviewQueue";
import {
  REVIEW_METADATA_BATCH_LIMIT,
  REVIEW_PRELOAD_AHEAD,
} from "@/features/documents/domain/reviewPreload";
import {
  serializeAdminDocumentView,
  serializeReviewQueueItem,
  type SerializedAdminDocumentView,
  type SerializedReviewQueueItem,
} from "@/features/documents/domain/adminView";
import { proposedCertificateExpiry } from "@/features/documents/domain/certificatePolicy";
import { MEDICAL_EXCESS_REASON, MEDICAL_KIND_MISMATCH_REASON } from "@/features/documents/domain/retention";
import { createDocumentAccessToken } from "@/features/documents/domain/signedUrl";
import { parseDateOnly } from "@/features/players/domain/dates";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { nextStepAfter } from "@/features/registrations/domain/wizard";
import { workspaceWriteCode } from "@/features/registrations/domain/writeGate";
import { fail, type ActionFailure } from "@/shared/errors";
import { viewWriteDenial } from "@/shared/lib/readOnlyGuard";
import { it } from "@/shared/i18n/it";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { SIGNED_URL_TTL_SECONDS } from "@/shared/config/app";
import { createNotification } from "@/features/notifications/data/notifications";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import {
  RATE_LIMITS,
  clientKey,
  consumeRateLimit,
  userAgentAndIp,
} from "@/shared/lib/request-guard";

async function persistWorkspaceStatus(userId: string) {
  const workspace = await loadPlayerWorkspace(userId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }
  return workspace;
}

export type ReviewDocumentQueueSuccess = {
  ok: true;
  reviewedId: string;
  nextId: string | null;
  queue: SerializedReviewQueueItem[];
};

async function afterReviewSideEffects(input: {
  documentId: string;
  decision: "APPROVED" | "REJECTED";
  playerUserId: string;
  reviewerId: string;
  reason?: string;
}) {
  await Promise.all([
    persistWorkspaceStatus(input.playerUserId),
    createNotification({
      userId: input.playerUserId,
      type: input.decision === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
      title: input.decision === "APPROVED" ? "Certificato approvato" : "Certificato da aggiornare",
      body:
        input.decision === "APPROVED"
          ? "L’organizzazione ha approvato il certificato. Continua l’iscrizione dalla tua area."
          : "L’organizzazione chiede di caricare di nuovo il certificato. Apri l’area personale per i dettagli.",
    }),
    (async () => {
      const trace = await userAgentAndIp();
      await writeAuditLog({
        actorUserId: input.reviewerId,
        action: input.decision === "APPROVED" ? "DOCUMENT_APPROVE" : "DOCUMENT_REJECT",
        entityType: "Document",
        entityId: input.documentId,
        metadata: input.decision === "REJECTED" ? { hasReason: true } : undefined,
        ...trace,
      });
    })(),
  ]);
  revalidatePath("/admin/documenti");
  revalidatePath(`/admin/documenti/${input.documentId}`);
  revalidatePath("/area");
}

function signedUrlForViewer(documentId: string, userId: string) {
  const expiresAtUnix = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const token = createDocumentAccessToken({
    documentId,
    userId,
    expiresAtUnix,
  });
  return `/api/documents/file?token=${encodeURIComponent(token)}`;
}

export async function uploadMedicalCertificateAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const denied = await viewWriteDenial();
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione/certificato");

  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) return fail("REGISTRATION_NOT_FOUND");

  const allowed = authorize(actor, "registration:write", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) return fail("FORBIDDEN_REGISTRATION_WRITE");
  if (workspace.registration.category === "STAFF") return fail("STAFF_MEDICAL_NOT_REQUIRED");
  const windowCode = workspaceWriteCode(workspace.registration);
  if (windowCode) return fail(windowCode);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return fail("AUTH_EMAIL_NOT_VERIFIED");
  }

  const rateKey = await clientKey(`upload:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs))) {
    return fail("DOCUMENT_UPLOAD_RATE_LIMITED");
  }

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const current = await getCurrentMedicalDocument(workspace.registration.id);
  const mustReplace =
    !current || current.status === "REJECTED" || current.status === "EXPIRED";

  if (!hasFile && mustReplace) {
    return fail("DOCUMENT_MISSING_FILE");
  }

  if (hasFile && file instanceof File) {
    const body = Buffer.from(await file.arrayBuffer());
    const stored = await storeMedicalCertificate({
      registrationId: workspace.registration.id,
      playerProfileId: workspace.profile.id,
      fileName: file.name,
      declaredMime: file.type || "application/octet-stream",
      body,
      requiredKind: workspace.registration.medicalCertificateKind,
      playerFirstName: workspace.profile.firstName,
      playerLastName: workspace.profile.lastName,
    });
    if (!stored.ok) {
      if (stored.reason === "size") {
        return fail("DOCUMENT_TOO_LARGE");
      }
      if (stored.reason === "scan") {
        return fail("DOCUMENT_SCAN_FAILED");
      }
      return fail("DOCUMENT_INVALID_TYPE");
    }

    const trace = await userAgentAndIp();
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "DOCUMENT_UPLOAD",
      entityType: "Document",
      entityId: stored.document.id,
      metadata: { mimeType: stored.document.mimeType, sizeBytes: stored.document.sizeBytes },
      ...trace,
    });
    const uploadedAt = stored.document.uploadedAt;
    const certificateId = stored.document.id;
    after(() => notifyCertificateUploaded({ certificateId, uploadedAt }));
  }

  const updated = await persistWorkspaceStatus(session.user.id);

  revalidatePath("/area");
  revalidatePath("/area/registrazione/certificato");
  revalidatePath("/admin/documenti");
  const intent = String(formData.get("intent") || "continue");
  if (intent === "exit") redirect("/area");
  const next = nextStepAfter("certificato", updated?.checklist ?? workspace.checklist);
  redirect(next === "area" ? "/area" : `/area/registrazione/${next}`);
}

export async function createSignedDocumentUrlAction(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");

  const [document] = await listDocumentsForFileAccess([documentId]);
  if (!document || document.blobPurgedAt) return fail("DOCUMENT_NOT_FOUND");

  const decision = authorize(actor, "document:read_file", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!decision.allow) return fail("FORBIDDEN_DOCUMENT_FILE");

  return { url: signedUrlForViewer(document.id, session.user.id) };
}

export async function createSignedDocumentUrlsAction(documentIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");

  const unique = [...new Set(documentIds)].slice(0, REVIEW_PRELOAD_AHEAD + 1);
  const rows = await listDocumentsForFileAccess(unique);
  const urls: Record<string, string> = {};
  for (const document of rows) {
    if (document.blobPurgedAt) continue;
    const decision = authorize(actor, "document:read_file", {
      ownerUserId: document.playerProfile.userId,
      teamId: document.registration.teamId,
    });
    if (!decision.allow) continue;
    urls[document.id] = signedUrlForViewer(document.id, session.user.id);
  }
  return { urls };
}

export async function loadReviewDocumentsAction(documentIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");

  const unique = [...new Set(documentIds)].slice(0, REVIEW_METADATA_BATCH_LIMIT);
  const rows = await getAdminDocumentViews(unique);
  const documents: SerializedAdminDocumentView[] = [];
  for (const row of rows) {
    if (row.status === "REPLACED") continue;
    const allowed = authorize(actor, "document:review", {
      ownerUserId: row.playerProfile.userId,
      teamId: row.registration.teamId,
    });
    if (!allowed.allow && !authorize(actor, "document:read_file", {
      ownerUserId: row.playerProfile.userId,
      teamId: row.registration.teamId,
    }).allow) {
      continue;
    }
    documents.push(serializeAdminDocumentView(row));
  }
  return { documents };
}

export async function refreshReviewQueueAction(filters: Parameters<typeof parseReviewQueueFilters>[0]) {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");
  const staff = authorize(actor, "admin:manage");
  const reviewer = authorize(actor, "document:review");
  if (!staff.allow && !reviewer.allow) {
    return fail("FORBIDDEN_DOCUMENT_FILE");
  }
  const queue = await listPendingMedicalQueue(medicalFiltersFromQueue(parseReviewQueueFilters(filters)));
  return { queue: queue.map(serializeReviewQueueItem) };
}

export async function reviewDocumentAction(
  _prev: ActionFailure | ReviewDocumentQueueSuccess | undefined,
  formData: FormData,
) {
  const denied = await viewWriteDenial();
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/documenti");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const filters = parseReviewQueueFilters({
    teamId: String(formData.get("teamId") ?? ""),
    q: String(formData.get("queueQ") ?? ""),
    editionId: String(formData.get("editionId") ?? ""),
    schoolId: String(formData.get("schoolId") ?? ""),
    requiredKind: String(formData.get("requiredKind") ?? ""),
    status: String(formData.get("queueStatus") ?? ""),
    anomaly: String(formData.get("anomaly") ?? ""),
    aiReview: String(formData.get("aiReview") ?? ""),
  });
  let reason = String(formData.get("reason") ?? "");
  if (formData.get("kindMismatch") === "on") {
    reason = reason.trim()
      ? `${MEDICAL_KIND_MISMATCH_REASON}. ${reason.trim()}`
      : MEDICAL_KIND_MISMATCH_REASON;
  }
  if (formData.get("excessHealth") === "on") {
    reason = reason.trim() ? `${MEDICAL_EXCESS_REASON}. ${reason.trim()}` : MEDICAL_EXCESS_REASON;
  }
  const typedExpiry = parseDateOnly(String(formData.get("expiresAt") ?? ""));
  const document = await getDocumentById(documentId);
  if (!document) return fail("DOCUMENT_NOT_FOUND");

  const allowed = authorize(actor, "document:review", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!allowed.allow) {
    redirect("/area");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") return fail("VALIDATION_INVALID_INPUT");
  const requiredKind = document.registration.team.edition.medicalCertificateKind;
  const confirmed =
    formData.get("kindConfirm") === "on" || formData.get("agonisticConfirm") === "on";
  if (decision === "APPROVED" && !confirmed) {
    return fail(requiredKind === "COMPETITIVE" ? "DOCUMENT_AGONISTIC_CONFIRM_REQUIRED" : "DOCUMENT_KIND_CONFIRM_REQUIRED");
  }

  const expiresAt =
    typedExpiry ??
    proposedCertificateExpiry({
      requiredKind,
      recognizedKind: document.inspection?.recognizedKind ?? null,
      issuedAt: document.inspection?.issuedAt ?? null,
      expiresAt: null,
    });

  const result = await reviewMedicalDocument({
    documentId,
    reviewerId: session.user.id,
    decision,
    reason,
    expiresAt,
    requiredKind,
  });
  if (!result.ok && result.reason === "reason_required") return fail("DOCUMENT_REJECT_REASON_REQUIRED");
  if (!result.ok && result.reason === "expiry_required") return fail("VALIDATION_INVALID_INPUT", it.adminExpiryRequired);
  if (!result.ok) return fail("DOCUMENT_ALREADY_REVIEWED");

  const flow = String(formData.get("flow") ?? "");
  const listed = await listPendingMedicalQueue(medicalFiltersFromQueue(filters));
  const queue = listed.filter((item) => item.id !== document.id);
  const nextId = nextPendingAfter(queue, { id: document.id, uploadedAt: document.uploadedAt });
  const serializedQueue = queue.map(serializeReviewQueueItem);
  const sideEffects = {
    documentId,
    decision,
    playerUserId: document.playerProfile.userId,
    reviewerId: session.user.id,
    reason: decision === "REJECTED" ? reason : undefined,
  } satisfies Parameters<typeof afterReviewSideEffects>[0];

  if (flow === "queue") {
    // Dopo la risposta: così questa action non rivalida la route corrente
    // e non rimonta il workspace sul certificato appena revisionato.
    after(() => afterReviewSideEffects(sideEffects));
    return { ok: true as const, reviewedId: document.id, nextId, queue: serializedQueue };
  }

  await afterReviewSideEffects(sideEffects);
  redirect(nextId ? reviewDocumentHref(nextId, filters) : reviewDoneHref(filters));
}

export type RevokeAiApprovalSuccess = {
  ok: true;
  document: SerializedAdminDocumentView;
  queue: SerializedReviewQueueItem[];
};

export async function revokeAiApprovalAction(
  _prev: ActionFailure | RevokeAiApprovalSuccess | undefined,
  formData: FormData,
): Promise<ActionFailure | RevokeAiApprovalSuccess> {
  const denied = await viewWriteDenial();
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/documenti");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const documentId = String(formData.get("documentId") ?? "");
  const document = await getDocumentById(documentId);
  if (!document) return fail("DOCUMENT_NOT_FOUND");

  const allowed = authorize(actor, "document:review", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!allowed.allow) redirect("/area");
  if (!canRevokeAiApproval(document)) return fail("DOCUMENT_AI_APPROVAL_NOT_REVOCABLE");

  const trace = await userAgentAndIp();
  const result = await revokeAiCertificateApproval({
    documentId,
    actorUserId: session.user.id,
    trace,
  });
  if (!result.ok) return fail("DOCUMENT_AI_APPROVAL_NOT_REVOCABLE");

  const [refreshed, queue] = await Promise.all([
    getAdminDocumentViews([documentId]),
    listPendingMedicalQueue(
      medicalFiltersFromQueue(
        parseReviewQueueFilters({
          teamId: String(formData.get("teamId") ?? ""),
          q: String(formData.get("queueQ") ?? ""),
          editionId: String(formData.get("editionId") ?? ""),
          schoolId: String(formData.get("schoolId") ?? ""),
          requiredKind: String(formData.get("requiredKind") ?? ""),
          status: String(formData.get("queueStatus") ?? ""),
          anomaly: String(formData.get("anomaly") ?? ""),
          aiReview: String(formData.get("aiReview") ?? ""),
        }),
      ),
    ),
  ]);
  const view = refreshed[0];
  if (!view) return fail("DOCUMENT_NOT_FOUND");
  revalidatePath("/admin/documenti");
  revalidatePath(`/admin/documenti/${documentId}`);
  revalidatePath("/area");
  return {
    ok: true,
    document: serializeAdminDocumentView(view),
    queue: queue.map(serializeReviewQueueItem),
  };
}
