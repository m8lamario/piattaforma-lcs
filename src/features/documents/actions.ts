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
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione/certificato");

  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) return { error: "Non hai un’iscrizione da completare." };

  const allowed = authorize(actor, "registration:write", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) return { error: "Non puoi caricare documenti per questa iscrizione." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return { error: "Verifica l’email prima di caricare documenti." };
  }

  const rateKey = await clientKey(`upload:${session.user.id}`);
  if (!consumeRateLimit(rateKey, RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs)) {
    return { error: "Troppi upload. Riprova più tardi." };
  }

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const current = await getCurrentMedicalDocument(workspace.registration.id);
  const mustReplace =
    !current || current.status === "REJECTED" || current.status === "EXPIRED";

  if (!hasFile && mustReplace) {
    return { error: "Seleziona un file PDF, JPEG o PNG." };
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
        return { error: "Il file supera la dimensione massima consentita." };
      }
      return { error: "Formato non valido. Usa PDF, JPEG o PNG." };
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
  if (!session?.user?.id) return { error: "Devi accedere." };
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return { error: "Account non trovato." };

  const document = await getDocumentById(documentId);
  if (!document) return { error: "Documento non disponibile." };

  const decision = authorize(actor, "document:read_file", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!decision.allow) return { error: "Non puoi aprire questo file." };

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
