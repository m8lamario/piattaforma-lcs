"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getCurrentMedicalDocument,
  getDocumentById,
  reviewMedicalDocument,
  storeMedicalCertificate,
} from "@/features/documents/data/documents";
import { createDocumentAccessToken } from "@/features/documents/domain/signedUrl";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { nextStepAfter } from "@/features/registrations/domain/wizard";
import { workspaceWriteCode } from "@/features/registrations/domain/writeGate";
import { fail, type ActionFailure } from "@/shared/errors";
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

export async function uploadMedicalCertificateAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
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

  const document = await getDocumentById(documentId);
  if (!document) return fail("DOCUMENT_NOT_FOUND");

  const decision = authorize(actor, "document:read_file", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!decision.allow) return fail("FORBIDDEN_DOCUMENT_FILE");

  const expiresAtUnix = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const token = createDocumentAccessToken({
    documentId: document.id,
    userId: session.user.id,
    expiresAtUnix,
  });
  return { url: `/api/documents/file?token=${encodeURIComponent(token)}` };
}

export async function reviewDocumentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/documenti");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const document = await getDocumentById(documentId);
  if (!document) return;

  const allowed = authorize(actor, "document:review", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!allowed.allow) {
    redirect("/area");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") return;

  const result = await reviewMedicalDocument({
    documentId,
    reviewerId: session.user.id,
    decision,
    reason,
  });
  if (!result.ok && result.reason === "reason_required") {
    redirect(`/admin/documenti/${documentId}?error=reason`);
  }
  if (!result.ok) return;

  await persistWorkspaceStatus(document.playerProfile.userId);

  await createNotification({
    userId: document.playerProfile.userId,
    type: decision === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
    title: decision === "APPROVED" ? "Certificato approvato" : "Certificato da aggiornare",
    body:
      decision === "APPROVED"
        ? "L’organizzazione ha approvato il certificato. Continua l’iscrizione dalla tua area."
        : "L’organizzazione chiede di caricare di nuovo il certificato. Apri l’area personale per i dettagli.",
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: decision === "APPROVED" ? "DOCUMENT_APPROVE" : "DOCUMENT_REJECT",
    entityType: "Document",
    entityId: documentId,
    metadata: decision === "REJECTED" ? { hasReason: true } : undefined,
    ...trace,
  });

  revalidatePath("/admin/documenti");
  revalidatePath(`/admin/documenti/${documentId}`);
  revalidatePath("/area");
  redirect("/admin/documenti");
}
