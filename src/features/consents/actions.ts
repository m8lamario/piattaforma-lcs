"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { appendBoxSet, appendConsentChoice } from "@/features/consents/data/choices";
import { ensureC1Sent, ensureMarketingOptIn } from "@/features/consents/data/followup";
import { recordConsent } from "@/features/consents/data/legal";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { dispatchConsentReceiptIfComplete } from "@/features/consents/data/receipt";
import { findValidConsentToken, markTokenUsed } from "@/features/consents/data/tokens";
import {
  isConsentBoxCode,
  mediaFormBoxes,
  privacyExtraBoxes,
  requiredPrivacyBoxes,
  revocableCodes,
  submittedBoxesFrom,
  type ConsentBoxCode,
} from "@/features/consents/domain/boxes";
import { privacySlugsFor } from "@/features/consents/domain/pack";
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

async function requireConsentAccount(nextPath = "/area/consensi") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/accedi?next=${nextPath}`);
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
  if (workspace.registration.status === "WITHDRAWN") {
    return { ok: false as const, error: fail("REGISTRATION_WITHDRAWN") };
  }
  if (workspace.registration.status === "REMOVED") {
    return { ok: false as const, error: fail("LIFECYCLE_REGISTRATION_REMOVED") };
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

async function requireWritable(nextPath = "/area/registrazione/privacy") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/accedi?next=${nextPath}`);
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
  revalidatePath("/area/consensi");
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
  const access = await requireWritable("/area/registrazione/privacy");
  if (!access.ok) return access.error;

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }

  const requiredSlugs = privacySlugsFor(workspace.evidence.isMinor);
  const partnersPublished = await isPartnerBoxVisible();
  const extra = privacyExtraBoxes(workspace.evidence.isMinor, partnersPublished);
  const extraSubmitted = submittedBoxesFrom(
    formData,
    extra.map((box) => box.code),
  );
  const termsAccepted = formData.get("accept:terms") === "on";
  const privacyDocs = requiredSlugs.filter((slug) => slug !== "terms");
  const packRead = privacyDocs.every((slug) => formData.get(`accept:${slug}`) === "on");
  const acknowledgement: ConsentBoxCode = workspace.evidence.isMinor ? "G2" : "M2";
  const boxes = [
    { code: "T1" as const, accepted: termsAccepted },
    { code: acknowledgement, accepted: packRead },
    ...extraSubmitted,
  ];

  const requiredCodes = new Set(requiredPrivacyBoxes(workspace.evidence.isMinor, partnersPublished).map((box) => box.code));
  const acceptedByCode = new Map(boxes.map((box) => [box.code, box.accepted]));
  if ([...requiredCodes].some((code) => !acceptedByCode.get(code))) {
    return fail("CONSENT_BOX_REQUIRED");
  }

  const trace = await userAgentAndIp();
  const mediaItem = workspace.checklist.find((item) => item.code === "MEDIA_RELEASE");

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
      metadata: { slug: stored.slug, versionId, version: stored.version },
      ...trace,
    });
  }

  const termsVersionId = String(formData.get("version:terms") ?? "") || null;
  await appendBoxSet({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    legalDocumentVersionId: termsVersionId,
    boxes,
    ...trace,
  });

  await ensureMarketingOptIn(workspace.registration.id);
  await ensureC1Sent(workspace.registration.id);

  await dispatchConsentReceiptIfComplete({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    isMinor: workspace.evidence.isMinor,
    mediaApplies: mediaItem != null && mediaItem.status !== "not_applicable",
    mediaRequired: mediaItem?.required ?? false,
  });

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
  const access = await requireWritable("/area/registrazione/liberatorie");
  if (!access.ok) return access.error;

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }

  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return fail("CONSENT_VERSION_MISSING");

  const formBoxes = mediaFormBoxes(workspace.evidence.isMinor, workspace.needsMediaAgreement);
  const boxes = submittedBoxesFrom(
    formData,
    formBoxes.map((box) => box.code),
  );

  const trace = await userAgentAndIp();
  const anyUse = boxes.some((box) => box.accepted && box.code !== "G14");
  const stored = await recordConsent({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    versionId,
    consentType: "OPTIONAL",
    accepted: anyUse,
    ...trace,
  });
  if (!stored.ok) {
    return fail("CONSENT_VERSION_STALE");
  }

  await appendBoxSet({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    legalDocumentVersionId: versionId,
    boxes,
    ...trace,
  });

  await writeAuditLog({
    actorUserId: session.user!.id,
    action: anyUse ? "CONSENT_ACCEPT" : "CONSENT_REFUSE",
    entityType: "ConsentRecord",
    entityId: stored.record.id,
    metadata: { slug: stored.slug, versionId, version: stored.version, accepted: anyUse },
    ...trace,
  });

  await ensureC1Sent(workspace.registration.id);

  await dispatchConsentReceiptIfComplete({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    isMinor: workspace.evidence.isMinor,
    mediaApplies: true,
    mediaRequired: workspace.checklist.find((item) => item.code === "MEDIA_RELEASE")?.required ?? false,
  });

  await persistAndRedirect(
    session.user!.id,
    "liberatorie",
    String(formData.get("intent") || "continue"),
    workspace.checklist,
  );
}

export async function revokeConsentBoxAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const access = await requireConsentAccount("/area/consensi");
  if (!access.ok) return access.error;

  const { session, workspace } = access;
  const rateKey = await clientKey(`consent:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }

  const code = String(formData.get("code") ?? "");
  if (!isConsentBoxCode(code)) return fail("CONSENT_REVOKE_FORBIDDEN");
  const allowed = revocableCodes(workspace.evidence.isMinor, workspace.partnersPublished);
  if (!allowed.some((box) => box.code === code)) {
    return fail("CONSENT_REVOKE_FORBIDDEN");
  }

  const trace = await userAgentAndIp();
  const record = await appendConsentChoice({
    userId: session.user!.id,
    registrationId: workspace.registration.id,
    code,
    accepted: false,
    ...trace,
  });
  await writeAuditLog({
    actorUserId: session.user!.id,
    action: "CONSENT_REVOKE",
    entityType: "ConsentChoice",
    entityId: record.id,
    metadata: { code },
    ...trace,
  });

  revalidatePath("/area");
  revalidatePath("/area/consensi");
  return undefined;
}

export async function requestErasureAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const access = await requireConsentAccount("/area/consensi");
  if (!access.ok) return access.error;
  const { session, workspace } = access;
  const rateKey = await clientKey(`erasure:${session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user!.id,
    action: "ERASURE_REQUEST",
    entityType: "User",
    entityId: session.user!.id,
    metadata: { registrationId: workspace.registration.id, confirm: String(formData.get("confirm") ?? "") },
    ...trace,
  });
  revalidatePath("/area/consensi");
  return { done: true as const };
}

export async function confirmC1Action(_prev: ActionFailure | undefined, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const rateKey = await clientKey(`c1:${token.slice(0, 12)}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }
  const found = await findValidConsentToken(token, "C1");
  if (!found) return fail("CONSENT_TOKEN_INVALID");
  if (found.stale === "used") return fail("CONSENT_TOKEN_USED");
  if (found.stale) return fail("CONSENT_TOKEN_INVALID");

  const trace = await userAgentAndIp();
  await appendConsentChoice({
    userId: found.registration.playerProfile.userId,
    registrationId: found.registrationId,
    code: "C1",
    accepted: true,
    source: "EMAIL",
    guardianId: found.guardianId,
    ...trace,
  });
  await markTokenUsed(found.id, trace.ipAddress, trace.userAgent);
  const workspace = await loadPlayerWorkspace(found.registration.playerProfile.userId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }
  return { done: true as const };
}

export async function confirmMarketingAction(_prev: ActionFailure | undefined, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const rateKey = await clientKey(`mkt:${token.slice(0, 12)}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }
  const found = await findValidConsentToken(token, "MARKETING");
  if (!found) return fail("CONSENT_TOKEN_INVALID");
  if (found.stale === "used") return fail("CONSENT_TOKEN_USED");
  if (found.stale) return fail("CONSENT_TOKEN_INVALID");

  const trace = await userAgentAndIp();
  await markTokenUsed(found.id, trace.ipAddress, trace.userAgent);
  const workspace = await loadPlayerWorkspace(found.registration.playerProfile.userId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }
  return { done: true as const };
}
