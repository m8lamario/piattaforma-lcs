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
import { RATE_LIMITS, clientKey, consumeRateLimit } from "@/shared/lib/request-guard";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { fail, failValidation, type ActionFailure } from "@/shared/errors";
import { viewWriteDenial } from "@/shared/lib/readOnlyGuard";
import { leagueActivationErrorCode } from "@/features/league/domain/activation";
import {
  activateLeagueSupervisorAccount,
  changeLeagueSupervisorEdition,
  createLeagueSupervisor,
  findLeagueSupervisorByActivationToken,
  inspectLeagueSupervisorActivation,
  issueLeagueSupervisorActivation,
  setLeagueSupervisorStatus,
} from "@/features/league/data/accounts";
import {
  activateLeagueSupervisorSchema,
  inviteLeagueSupervisorSchema,
  leagueSupervisorEditionSchema,
  leagueSupervisorStatusSchema,
} from "@/features/league/schemas/accounts";
import { appOrigin } from "@/shared/config/app";

function formatExpiry(value: Date) {
  return value.toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
}

async function requireLeagueManager() {
  if (await viewWriteDenial()) redirect("/admin/supervisori");
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/supervisori");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "league:manage").allow) redirect("/admin");
  return { session, actor };
}

async function sendActivationEmail(input: {
  accountId: string;
  userId: string;
  email: string;
  firstName: string;
  editionTitle: string;
  activateUrl: string;
  expiresAt: Date;
  actorUserId: string;
}) {
  await dispatchOutboundEmail({
    idempotencyKey: `league-supervisor:${input.accountId}:activate:${input.expiresAt.getTime()}`,
    purpose: "LEAGUE_SUPERVISOR_ACTIVATE",
    templateKey: "LEAGUE_SUPERVISOR_ACTIVATE",
    to: input.email,
    userId: input.userId,
    recipientKind: "USER",
    variables: {
      nome: input.firstName,
      firstName: input.firstName,
      title: input.editionTitle,
      activateUrl: input.activateUrl,
      scadenza: formatExpiry(input.expiresAt),
    },
    sourceEntityType: "LeagueSupervisor",
    sourceEntityId: input.accountId,
    actorUserId: input.actorUserId,
  });
}

export async function inviteLeagueSupervisorAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireLeagueManager();
  const parsed = inviteLeagueSupervisorSchema.safeParse({
    editionId: formData.get("editionId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await createLeagueSupervisor({
    ...parsed.data,
    origin: appOrigin(),
    createdByUserId: session.user.id,
  });
  if (!result.ok) return fail(result.code);

  await sendActivationEmail({
    accountId: result.account.id,
    userId: result.userId,
    email: result.email,
    firstName: result.firstName,
    editionTitle: result.editionTitle,
    activateUrl: result.activateUrl,
    expiresAt: result.expiresAt,
    actorUserId: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ORGANIZATION_ADMIN",
    action: "LEAGUE_SUPERVISOR_INVITED",
    entityType: "LeagueSupervisor",
    entityId: result.account.id,
    metadata: { editionId: parsed.data.editionId },
  });
  revalidatePath("/admin/supervisori");
  revalidatePath(`/admin/edizioni/${parsed.data.editionId}`);
  return { done: true };
}

export async function setLeagueSupervisorStatusAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireLeagueManager();
  const parsed = leagueSupervisorStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await setLeagueSupervisorStatus(parsed.data);
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ORGANIZATION_ADMIN",
    action: parsed.data.status === "SUSPENDED" ? "LEAGUE_SUPERVISOR_SUSPENDED" : "LEAGUE_SUPERVISOR_REACTIVATED",
    entityType: "LeagueSupervisor",
    entityId: parsed.data.id,
    metadata: { editionId: result.editionId, status: parsed.data.status },
  });
  revalidatePath("/admin/supervisori");
  revalidatePath(`/admin/edizioni/${result.editionId}`);
  return { done: true };
}

export async function changeLeagueSupervisorEditionAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireLeagueManager();
  const parsed = leagueSupervisorEditionSchema.safeParse({
    id: formData.get("id"),
    editionId: formData.get("editionId"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await changeLeagueSupervisorEdition(parsed.data);
  if (!result.ok) return fail(result.code);

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ORGANIZATION_ADMIN",
    action: "LEAGUE_SUPERVISOR_EDITION_CHANGED",
    entityType: "LeagueSupervisor",
    entityId: parsed.data.id,
    metadata: { editionId: result.editionId, previousEditionId: result.previousEditionId },
  });
  revalidatePath("/admin/supervisori");
  revalidatePath(`/admin/edizioni/${result.editionId}`);
  if (result.previousEditionId !== result.editionId) {
    revalidatePath(`/admin/edizioni/${result.previousEditionId}`);
  }
  return { done: true };
}

export async function resendLeagueSupervisorActivationAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireLeagueManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("LEAGUE_NOT_FOUND");
  const rateKey = await clientKey("league-supervisor-resend");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.leagueResend.limit, RATE_LIMITS.leagueResend.windowMs))) {
    return fail("LEAGUE_RATE_LIMITED");
  }
  const result = await issueLeagueSupervisorActivation({ id, origin: appOrigin() });
  if (!result.ok) return fail(result.code);
  await sendActivationEmail({
    accountId: result.accountId,
    userId: result.userId,
    email: result.email,
    firstName: result.firstName,
    editionTitle: result.editionTitle,
    activateUrl: result.activateUrl,
    expiresAt: result.expiresAt,
    actorUserId: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ORGANIZATION_ADMIN",
    action: "LEAGUE_SUPERVISOR_INVITED",
    entityType: "LeagueSupervisor",
    entityId: result.accountId,
    metadata: { editionId: result.editionId, resend: true },
  });
  revalidatePath("/admin/supervisori");
  revalidatePath(`/admin/edizioni/${result.editionId}`);
  return { done: true };
}

export async function activateLeagueSupervisorAction(_prev: ActionFailure | undefined, formData: FormData) {
  const parsed = activateLeagueSupervisorSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (!isWellFormedInviteToken(parsed.data.token)) return fail("LEAGUE_TOKEN_INVALID");

  const rateKey = await clientKey("league-supervisor-activate");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.leagueActivate.limit, RATE_LIMITS.leagueActivate.windowMs))) {
    return fail("LEAGUE_RATE_LIMITED");
  }

  const found = await findLeagueSupervisorByActivationToken(parsed.data.token);
  const inspection = inspectLeagueSupervisorActivation(found);
  if (inspection !== "ok") return fail(leagueActivationErrorCode(inspection));

  const result = await activateLeagueSupervisorAccount(parsed.data);
  if (!result.ok) return fail(leagueActivationErrorCode(result.outcome));

  await writeAuditLog({
    actorUserId: result.userId,
    actorRole: "LEAGUE_SUPERVISOR",
    action: "LEAGUE_SUPERVISOR_ACTIVATED",
    entityType: "LeagueSupervisor",
    entityId: result.accountId,
  });
  await deliverEmailVerification({ userId: result.userId, email: result.email });
  redirect(`/accedi?next=${encodeURIComponent(emailVerificationPath("/lega"))}`);
}
