"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { deliverEmailVerification } from "@/features/auth/data/emailVerification";
import { emailVerificationPath } from "@/features/auth/domain/verify";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { fail, failValidation, type ActionFailure, type ActionState } from "@/shared/errors";
import { mediaActivationErrorCode } from "@/features/media-partners/domain/activation";
import { MEDIA_SEARCH_MIN_LENGTH } from "@/features/media-partners/domain/verify";
import {
  activateMediaPartnerAccount,
  createMediaPartner,
  createMediaPartnerAccount,
  findMediaPartnerByActivationToken,
  inspectMediaPartnerActivation,
  issueMediaPartnerActivation,
  setMediaPartnerAccountStatus,
  setMediaPartnerStatus,
  updateMediaPartner,
} from "@/features/media-partners/data/partners";
import { loadMediaPlayerCard, mediaCompetitionScope, searchMediaPlayers } from "@/features/media-partners/data/verify";
import {
  activateMediaPartnerSchema,
  createMediaPartnerAccountSchema,
  mediaCardSchema,
  mediaPartnerOrgSchema,
  mediaPartnerStatusSchema,
  mediaSearchSchema,
} from "@/features/media-partners/schemas/partners";
import type { MediaPlayerCard, MediaSearchHit } from "@/features/media-partners/domain/verify";
import { appOrigin } from "@/shared/config/app";

function formatExpiry(value: Date) {
  return value.toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
}

function competitionIdsFrom(formData: FormData) {
  return formData.getAll("competitionId").map(String).filter(Boolean);
}

async function requireMediaManager() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/media-partner");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "media:manage").allow) redirect("/admin");
  return { session, actor };
}

async function requireVerifier() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: fail("AUTH_SESSION_REQUIRED") };
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return { ok: false as const, error: fail("AUTH_ACCOUNT_MISSING") };
  if (!authorize(actor, "media:verify").allow) {
    return { ok: false as const, error: fail("MEDIA_PARTNER_FORBIDDEN") };
  }
  const scope = mediaCompetitionScope(actor);
  if (!scope) return { ok: false as const, error: fail("MEDIA_PARTNER_FORBIDDEN") };
  return { ok: true as const, session, actor, scope };
}

export async function createMediaPartnerAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const parsed = mediaPartnerOrgSchema.safeParse({
    name: formData.get("name"),
    competitionIds: competitionIdsFrom(formData),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await createMediaPartner(parsed.data);
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: "MEDIA_PARTNER_CREATE",
    entityType: "MediaPartner",
    entityId: result.partner.id,
    metadata: { competitions: parsed.data.competitionIds.length },
  });
  revalidatePath("/admin/media-partner");
  redirect(`/admin/media-partner/${result.partner.id}`);
}

export async function updateMediaPartnerAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const id = String(formData.get("id") ?? "");
  const parsed = mediaPartnerOrgSchema.safeParse({
    name: formData.get("name"),
    competitionIds: competitionIdsFrom(formData),
  });
  if (!id) return fail("MEDIA_PARTNER_NOT_FOUND");
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await updateMediaPartner({ id, ...parsed.data });
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: "MEDIA_PARTNER_UPDATE",
    entityType: "MediaPartner",
    entityId: id,
    metadata: { competitions: parsed.data.competitionIds.length },
  });
  revalidatePath("/admin/media-partner");
  revalidatePath(`/admin/media-partner/${id}`);
  return { done: true };
}

export async function setMediaPartnerStatusAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const parsed = mediaPartnerStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await setMediaPartnerStatus(parsed.data);
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: parsed.data.status === "SUSPENDED" ? "MEDIA_PARTNER_SUSPEND" : "MEDIA_PARTNER_REACTIVATE",
    entityType: "MediaPartner",
    entityId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/admin/media-partner");
  revalidatePath(`/admin/media-partner/${parsed.data.id}`);
  return { done: true };
}

export async function createMediaPartnerAccountAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const parsed = createMediaPartnerAccountSchema.safeParse({
    mediaPartnerId: formData.get("mediaPartnerId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await createMediaPartnerAccount({
    ...parsed.data,
    origin: appOrigin(),
  });
  if (!result.ok) return fail(result.code);

  await dispatchOutboundEmail({
    idempotencyKey: `media-partner:${result.account.id}:activate:${result.expiresAt.getTime()}`,
    purpose: "MEDIA_PARTNER_ACTIVATE",
    templateKey: "MEDIA_PARTNER_ACTIVATE",
    to: result.email,
    userId: result.userId,
    recipientKind: "USER",
    variables: {
      nome: result.firstName,
      firstName: result.firstName,
      title: result.partnerName,
      activateUrl: result.activateUrl,
      scadenza: formatExpiry(result.expiresAt),
    },
    sourceEntityType: "MediaPartnerAccount",
    sourceEntityId: result.account.id,
    actorUserId: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: "MEDIA_PARTNER_CREATE",
    entityType: "MediaPartnerAccount",
    entityId: result.account.id,
    metadata: { partnerId: parsed.data.mediaPartnerId },
  });
  revalidatePath(`/admin/media-partner/${parsed.data.mediaPartnerId}`);
  return { done: true };
}

export async function setMediaPartnerAccountStatusAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const parsed = mediaPartnerStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await setMediaPartnerAccountStatus(parsed.data);
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: parsed.data.status === "SUSPENDED" ? "MEDIA_PARTNER_SUSPEND" : "MEDIA_PARTNER_REACTIVATE",
    entityType: "MediaPartnerAccount",
    entityId: parsed.data.id,
    metadata: { partnerId: result.mediaPartnerId, status: parsed.data.status },
  });
  revalidatePath(`/admin/media-partner/${result.mediaPartnerId}`);
  return { done: true };
}

export async function resendMediaPartnerActivationAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireMediaManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("MEDIA_PARTNER_NOT_FOUND");

  const result = await issueMediaPartnerActivation({ id, origin: appOrigin() });
  if (!result.ok) return fail(result.code);

  await dispatchOutboundEmail({
    idempotencyKey: `media-partner:${result.accountId}:resend:${result.expiresAt.getTime()}`,
    purpose: "MEDIA_PARTNER_ACTIVATE",
    templateKey: "MEDIA_PARTNER_ACTIVATE",
    to: result.email,
    recipientKind: "USER",
    variables: {
      nome: result.firstName,
      firstName: result.firstName,
      title: result.partnerName,
      activateUrl: result.activateUrl,
      scadenza: formatExpiry(result.expiresAt),
    },
    sourceEntityType: "MediaPartnerAccount",
    sourceEntityId: result.accountId,
    actorUserId: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "SUPER_ADMIN",
    action: "MEDIA_PARTNER_UPDATE",
    entityType: "MediaPartnerAccount",
    entityId: result.accountId,
    metadata: { partnerId: result.mediaPartnerId, resend: true },
  });
  revalidatePath(`/admin/media-partner/${result.mediaPartnerId}`);
  return { done: true };
}

export async function activateMediaPartnerAction(_prev: ActionFailure | undefined, formData: FormData) {
  const parsed = activateMediaPartnerSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (!isWellFormedInviteToken(parsed.data.token)) return fail("MEDIA_PARTNER_TOKEN_INVALID");

  const rateKey = await clientKey("media-partner-activate");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.schoolAccessActivate.limit, RATE_LIMITS.schoolAccessActivate.windowMs))) {
    return fail("MEDIA_PARTNER_RATE_LIMITED");
  }

  const found = await findMediaPartnerByActivationToken(parsed.data.token);
  const inspection = inspectMediaPartnerActivation(found);
  if (inspection !== "ok") return fail(mediaActivationErrorCode(inspection));

  const result = await activateMediaPartnerAccount(parsed.data);
  if (!result.ok) return fail(mediaActivationErrorCode(result.outcome));

  await writeAuditLog({
    actorUserId: result.userId,
    actorRole: "MEDIA_PARTNER",
    action: "MEDIA_PARTNER_UPDATE",
    entityType: "MediaPartnerAccount",
    entityId: result.accountId,
    metadata: { activated: true },
  });
  await deliverEmailVerification({ userId: result.userId, email: result.email });
  redirect(`/accedi?next=${encodeURIComponent(emailVerificationPath("/media"))}`);
}

export async function searchMediaPlayersAction(
  _prev: ActionState<{ results?: MediaSearchHit[] }> | undefined,
  formData: FormData,
): Promise<ActionState<{ results?: MediaSearchHit[] }>> {
  const access = await requireVerifier();
  if (!access.ok) return access.error;

  const parsed = mediaSearchSchema.safeParse({ query: formData.get("query") });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (parsed.data.query.length < MEDIA_SEARCH_MIN_LENGTH) {
    return { results: [] };
  }

  const rateKey = await clientKey(`media-search:${access.session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.mediaSearch.limit, RATE_LIMITS.mediaSearch.windowMs))) {
    return fail("MEDIA_PARTNER_RATE_LIMITED");
  }

  const results = await searchMediaPlayers({ query: parsed.data.query, competitionIds: access.scope });
  return { results };
}

export async function loadMediaPlayerCardAction(
  _prev: ActionState<{ card?: MediaPlayerCard }> | undefined,
  formData: FormData,
): Promise<ActionState<{ card?: MediaPlayerCard }>> {
  const access = await requireVerifier();
  if (!access.ok) return access.error;

  const parsed = mediaCardSchema.safeParse({ registrationId: formData.get("registrationId") });
  if (!parsed.success) return fail("MEDIA_PARTNER_PLAYER_NOT_FOUND");

  const rateKey = await clientKey(`media-verify:${access.session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.mediaVerify.limit, RATE_LIMITS.mediaVerify.windowMs))) {
    return fail("MEDIA_PARTNER_RATE_LIMITED");
  }

  const trace = await userAgentAndIp();
  const loaded = await loadMediaPlayerCard({
    registrationId: parsed.data.registrationId,
    competitionIds: access.scope,
  });

  if (!loaded) {
    await writeAuditLog({
      actorUserId: access.session.user.id,
      actorRole: "MEDIA_PARTNER",
      action: "MEDIA_VERIFY_DENIED",
      entityType: "Registration",
      entityId: parsed.data.registrationId,
      metadata: { reason: "forbidden" },
      ...trace,
    });
    return fail("MEDIA_PARTNER_PLAYER_NOT_FOUND");
  }

  const allowed = authorize(access.actor, "media:verify", { competitionId: loaded.competitionId });
  if (!allowed.allow) {
    await writeAuditLog({
      actorUserId: access.session.user.id,
      actorRole: "MEDIA_PARTNER",
      action: "MEDIA_VERIFY_DENIED",
      entityType: "Registration",
      entityId: parsed.data.registrationId,
      metadata: { reason: "forbidden" },
      ...trace,
    });
    return fail("MEDIA_PARTNER_PLAYER_NOT_FOUND");
  }

  await writeAuditLog({
    actorUserId: access.session.user.id,
    actorRole: access.actor.mediaPartner ? "MEDIA_PARTNER" : "SUPER_ADMIN",
    action: "MEDIA_VERIFY",
    entityType: "Registration",
    entityId: loaded.card.registrationId,
    metadata: {
      competitionId: loaded.competitionId,
      photoVideo: loaded.card.photoVideo.state,
      social: loaded.card.social.state,
    },
    ...trace,
  });
  return { card: loaded.card };
}
