"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { recordConsent } from "@/features/consents/data/legal";
import { MEDIA_RELEASE_SLUG, privacySlugsFor } from "@/features/consents/domain/pack";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { nextStepAfter } from "@/features/registrations/domain/wizard";
import { workspaceWriteError } from "@/features/registrations/domain/writeGate";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import {
  RATE_LIMITS,
  clientKey,
  consumeRateLimit,
  userAgentAndIp,
} from "@/shared/lib/request-guard";

async function requireWritable() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione/privacy");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) {
    return { ok: false as const, error: "Non hai un’iscrizione da completare." };
  }

  const allowed = authorize(actor, "registration:write", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) {
    return { ok: false as const, error: "Non puoi modificare questa iscrizione." };
  }
  const windowError = workspaceWriteError(workspace.registration);
  if (windowError) {
    return { ok: false as const, error: windowError };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return { ok: false as const, error: "Verifica l’email prima di confermare i consensi." };
  }

  return { ok: true as const, session, workspace };
}

async function persistAndRedirect(
  userId: string,
  current: "privacy" | "liberatorie",
  intent: string,
  checklistFallback: Parameters<typeof nextStepAfter>[1],
) {
  const updated = await loadPlayerWorkspace(userId);
  if (updated) {
    await persistRegistrationStatus(updated.registration.id, updated.projectedStatus);
  }
  revalidatePath("/area");
  revalidatePath("/area/registrazione/privacy");
  revalidatePath("/area/registrazione/liberatorie");
  if (intent === "exit") redirect("/area");
  const next = nextStepAfter(current, updated?.checklist ?? checklistFallback);
  redirect(next === "area" ? "/area" : `/area/registrazione/${next}`);
}

export async function savePrivacyConsentsAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const access = await requireWritable();
  if (!access.ok) return { error: access.error };

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return { error: "Troppe conferme in poco tempo. Riprova più tardi." };
  }

  const requiredSlugs = privacySlugsFor(workspace.evidence.isMinor);
  const trace = await userAgentAndIp();

  for (const slug of requiredSlugs) {
    const versionId = String(formData.get(`version:${slug}`) ?? "");
    const accepted = formData.get(`accept:${slug}`) === "on";
    if (!accepted || !versionId) {
      return { error: "Devi confermare ogni informativa di questo passo. Nessuna è preselezionata." };
    }
    const stored = await recordConsent({
      userId: session.user!.id,
      registrationId: workspace.registration.id,
      versionId,
      consentType: "REQUIRED",
      accepted: true,
      ...trace,
    });
    if (!stored.ok) {
      return { error: "Il testo è stato aggiornato. Rileggi la versione corrente e conferma di nuovo." };
    }
    await writeAuditLog({
      actorUserId: session.user!.id,
      action: "CONSENT_ACCEPT",
      entityType: "ConsentRecord",
      entityId: stored.record.id,
      metadata: { slug: stored.slug, versionId },
      ...trace,
    });
  }

  await persistAndRedirect(
    session.user!.id,
    "privacy",
    String(formData.get("intent") || "continue"),
    workspace.checklist,
  );
}

export async function saveMediaConsentAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const access = await requireWritable();
  if (!access.ok) return { error: access.error };

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return { error: "Troppe conferme in poco tempo. Riprova più tardi." };
  }

  const decision = String(formData.get("decision") ?? "");
  if (decision !== "accept" && decision !== "refuse") {
    return { error: "Scegli se accettare o non accettare la liberatoria." };
  }

  const mediaRequired =
    workspace.checklist.find((item) => item.code === "MEDIA_RELEASE")?.required ?? false;
  if (mediaRequired && decision === "refuse") {
    return { error: "Per questa edizione la liberatoria è obbligatoria." };
  }

  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return { error: "Versione informativa mancante. Ricarica la pagina." };

  const trace = await userAgentAndIp();
  const stored = await recordConsent({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    versionId,
    consentType: mediaRequired ? "REQUIRED" : "OPTIONAL",
    accepted: decision === "accept",
    ...trace,
  });
  if (!stored.ok) {
    return { error: "Il testo è stato aggiornato. Rileggi la versione corrente e scegli di nuovo." };
  }

  await writeAuditLog({
    actorUserId: session.user!.id,
    action: decision === "accept" ? "CONSENT_ACCEPT" : "CONSENT_REFUSE",
    entityType: "ConsentRecord",
    entityId: stored.record.id,
    metadata: { slug: MEDIA_RELEASE_SLUG, accepted: decision === "accept" },
    ...trace,
  });

  await persistAndRedirect(
    session.user!.id,
    "liberatorie",
    String(formData.get("intent") || "continue"),
    workspace.checklist,
  );
}
