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
import { workspaceWriteCode } from "@/features/registrations/domain/writeGate";
import { fail, type ActionFailure } from "@/shared/errors";
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
    return { ok: false as const, error: fail("REGISTRATION_NOT_FOUND") };
  }

  const allowed = authorize(actor, "registration:write", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) {
    return { ok: false as const, error: fail("FORBIDDEN_REGISTRATION_WRITE") };
  }
  const windowCode = workspaceWriteCode(workspace.registration);
  if (windowCode) {
    return { ok: false as const, error: fail(windowCode) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return { ok: false as const, error: fail("AUTH_EMAIL_NOT_VERIFIED") };
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
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const access = await requireWritable();
  if (!access.ok) return access.error;

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }

  const requiredSlugs = privacySlugsFor(workspace.evidence.isMinor);
  const trace = await userAgentAndIp();

  for (const slug of requiredSlugs) {
    const versionId = String(formData.get(`version:${slug}`) ?? "");
    const accepted = formData.get(`accept:${slug}`) === "on";
    if (!accepted || !versionId) {
      return fail("CONSENT_REQUIRED_UNCHECKED");
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
      return fail("CONSENT_VERSION_STALE");
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
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const access = await requireWritable();
  if (!access.ok) return access.error;

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }

  const decision = String(formData.get("decision") ?? "");
  if (decision !== "accept" && decision !== "refuse") {
    return fail("CONSENT_MEDIA_DECISION_REQUIRED");
  }

  const mediaRequired =
    workspace.checklist.find((item) => item.code === "MEDIA_RELEASE")?.required ?? false;
  if (mediaRequired && decision === "refuse") {
    return fail("CONSENT_MEDIA_REQUIRED");
  }

  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return fail("CONSENT_VERSION_MISSING");

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
    return fail("CONSENT_VERSION_STALE");
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
