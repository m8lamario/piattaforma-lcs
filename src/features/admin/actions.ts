"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import type { RequirementAudience, RequirementCode } from "@generated/client";
import {
  createCompetitionWithEdition,
  createSchoolAndTeam,
  deleteEditionAdmin,
  getEditionAdmin,
  updateEditionAdmin,
} from "@/features/admin/data/catalog";
import { createStaffInvite, findStaffInviteByPlainToken, redeemStaffInvite } from "@/features/admin/data/staffInvites";
import {
  editionFormSchema,
  redeemStaffSchema,
  REQUIREMENT_CODES,
  staffInviteSchema,
  teamFormSchema,
} from "@/features/admin/schemas/org";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { ensureEmailVerification } from "@/features/auth/data/emailVerification";
import { emailVerificationPath } from "@/features/auth/domain/verify";
import { fail, failValidation, type ActionFailure, type ActionState } from "@/shared/errors";
import { anonymizeUserAccount, deleteUserAccount } from "@/features/admin/data/lifecycle";
import { anonymizeAccountSchema, deleteAccountSchema, schoolLifecycleSchema } from "@/features/admin/schemas/lifecycle";
import { anonymizeSchoolAccount, deleteSchoolAccount } from "@/features/admin/data/schoolLifecycle";
import { appOrigin } from "@/shared/config/app";
import { parseEuroToCents } from "@/features/payments/domain/fees";
import { saveEditionDefaultFees, saveTeamFeeOverrides } from "@/features/admin/data/team-fees";

function parseOptionalDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalAmount(value?: string) {
  if (!value?.trim()) return null;
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function decimalAmount(value: { toString(): string } | null | undefined) {
  if (value == null) return null;
  const amount = Number(value.toString());
  return Number.isFinite(amount) ? amount : null;
}

function optionalFeeCents(raw: string) {
  if (!raw.trim()) return { ok: true as const, cents: null };
  const parsed = parseEuroToCents(raw);
  return parsed.ok ? { ok: true as const, cents: parsed.cents } : { ok: false as const };
}

async function requireFeeActor() {
  const access = await requireAdminActor();
  if (!authorize(access.actor, "fee:manage").allow) return fail("FORBIDDEN_RESOURCE");
  return access;
}

function requirementsFromForm(formData: FormData) {
  return REQUIREMENT_CODES.map((code) => ({
    code: code as RequirementCode,
    required: formData.get(`req_${code}`) === "on",
    appliesTo: (code === "GUARDIAN_IF_MINOR" ? "MINOR" : "ALL") as RequirementAudience,
  }));
}

async function requireAdminActor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "admin:manage").allow) redirect("/area");
  return { session, actor };
}

export async function createEditionAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session, actor } = await requireAdminActor();
  const canFees = authorize(actor, "fee:manage").allow;
  const parsed = editionFormSchema.safeParse({
    competitionName: formData.get("competitionName"),
    editionName: formData.get("editionName"),
    year: formData.get("year"),
    paymentMode: formData.get("paymentMode"),
    playerFeeAmount: formData.get("playerFeeAmount") || undefined,
    staffFeeAmount: formData.get("staffFeeAmount") || undefined,
    teamFeeAmount: formData.get("teamFeeAmount") || undefined,
    isActive: formData.get("isActive") || undefined,
    registrationOpensAt: formData.get("registrationOpensAt") || undefined,
    registrationClosesAt: formData.get("registrationClosesAt") || undefined,
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  const created = await createCompetitionWithEdition({
    ...parsed.data,
    playerFeeAmount: canFees ? parseOptionalAmount(parsed.data.playerFeeAmount) : null,
    staffFeeAmount: canFees ? (parseOptionalAmount(parsed.data.staffFeeAmount) ?? 5) : 5,
    teamFeeAmount: canFees ? parseOptionalAmount(parsed.data.teamFeeAmount) : null,
    isActive: parsed.data.isActive === "on",
    registrationOpensAt: parseOptionalDate(parsed.data.registrationOpensAt),
    registrationClosesAt: parseOptionalDate(parsed.data.registrationClosesAt),
    requirements: requirementsFromForm(formData),
  });
  const editionId = created.editions[0]?.id;
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EDITION_CREATE",
    entityType: "Edition",
    entityId: editionId ?? created.id,
  });
  revalidatePath("/admin/edizioni");
  redirect(editionId ? `/admin/edizioni/${editionId}` : "/admin/edizioni");
}

export async function updateEditionAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session, actor } = await requireAdminActor();
  const canFees = authorize(actor, "fee:manage").allow;
  const id = String(formData.get("id") ?? "");
  const existing = await getEditionAdmin(id);
  if (!existing) return fail("EDITION_NOT_FOUND");
  const parsed = editionFormSchema.safeParse({
    competitionName: existing.competition.name,
    editionName: formData.get("editionName"),
    year: formData.get("year"),
    paymentMode: formData.get("paymentMode"),
    playerFeeAmount: formData.get("playerFeeAmount") || undefined,
    staffFeeAmount: formData.get("staffFeeAmount") || undefined,
    teamFeeAmount: formData.get("teamFeeAmount") || undefined,
    isActive: formData.get("isActive") || undefined,
    registrationOpensAt: formData.get("registrationOpensAt") || undefined,
    registrationClosesAt: formData.get("registrationClosesAt") || undefined,
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  await updateEditionAdmin({
    id,
    name: parsed.data.editionName,
    year: parsed.data.year,
    paymentMode: parsed.data.paymentMode,
    playerFeeAmount: canFees ? parseOptionalAmount(parsed.data.playerFeeAmount) : decimalAmount(existing.playerFeeAmount),
    staffFeeAmount: canFees
      ? (parseOptionalAmount(parsed.data.staffFeeAmount) ?? 5)
      : (decimalAmount(existing.staffFeeAmount) ?? 5),
    teamFeeAmount: canFees ? parseOptionalAmount(parsed.data.teamFeeAmount) : decimalAmount(existing.teamFeeAmount),
    isActive: parsed.data.isActive === "on",
    registrationOpensAt: parseOptionalDate(parsed.data.registrationOpensAt),
    registrationClosesAt: parseOptionalDate(parsed.data.registrationClosesAt),
    requirements: requirementsFromForm(formData),
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EDITION_UPDATE",
    entityType: "Edition",
    entityId: id,
  });
  revalidatePath("/admin/edizioni");
  revalidatePath(`/admin/edizioni/${id}`);
  return {};
}

export async function createTeamAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireAdminActor();
  const parsed = teamFormSchema.safeParse({
    editionId: formData.get("editionId"),
    schoolName: formData.get("schoolName"),
    schoolCity: formData.get("schoolCity") || undefined,
    teamName: formData.get("teamName"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  const team = await createSchoolAndTeam(parsed.data);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEAM_CREATE",
    entityType: "Team",
    entityId: team.id,
  });
  revalidatePath("/admin/squadre");
  redirect(`/admin/squadre/${team.id}`);
}

export async function createStaffInviteAction(
  _prev: ActionState<{ redeemUrl?: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ redeemUrl?: string }>> {
  const { session, actor } = await requireAdminActor();
  const parsed = staffInviteSchema.safeParse({
    teamId: formData.get("teamId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!authorize(actor, "staff:invite", { teamId: parsed.data.teamId }).allow) {
    return fail("FORBIDDEN_STAFF_INVITE");
  }
  const rateKey = await clientKey(`staff-invite:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteCreate.limit, RATE_LIMITS.inviteCreate.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }
  const { invite, redeemUrl } = await createStaffInvite({
    ...parsed.data,
    invitedByUserId: session.user.id,
    origin: appOrigin(),
  });
  await dispatchOutboundEmail({
    idempotencyKey: `staff-invite:${invite.id}:create`,
    purpose: "staff-invite",
    templateKey: "staff-invite",
    to: parsed.data.email,
    recipientKind: "USER",
    variables: { teamName: invite.team.name, nome_squadra: invite.team.name, redeemUrl },
    sourceEntityType: "StaffInvite",
    sourceEntityId: invite.id,
    actorUserId: session.user.id,
  });
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STAFF_INVITE_CREATE",
    entityType: "StaffInvite",
    entityId: invite.id,
    metadata: { teamId: invite.teamId },
    ...trace,
  });
  revalidatePath(`/admin/squadre/${invite.teamId}`);
  return { redeemUrl };
}

export async function redeemStaffInviteAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const parsed = redeemStaffSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!isWellFormedInviteToken(parsed.data.token)) {
    return fail("STAFF_INVITE_INVALID");
  }
  const rateKey = await clientKey("staff-redeem");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteRedeem.limit, RATE_LIMITS.inviteRedeem.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }
  const found = await findStaffInviteByPlainToken(parsed.data.token);
  if (!found || found.inspection.outcome !== "redeemable") {
    return fail("STAFF_INVITE_INVALID");
  }
  const session = await auth();
  try {
    const result = await redeemStaffInvite({
      token: parsed.data.token,
      password: parsed.data.password,
      sessionUserId: session?.user?.id,
    });
    if (!result.ok) {
      if (result.reason === "login_required") {
        return fail("STAFF_INVITE_LOGIN_REQUIRED");
      }
      if (result.reason === "create_account") {
        return fail("STAFF_INVITE_PASSWORD_REQUIRED");
      }
      if (result.reason === "wrong_session_email") {
        return fail("STAFF_INVITE_WRONG_SESSION");
      }
      return fail("STAFF_INVITE_INVALID");
    }
    await writeAuditLog({
      actorUserId: result.user.id,
      action: "STAFF_INVITE_REDEEM",
      entityType: "StaffInvite",
      entityId: found.invite.id,
    });
    const status = await ensureEmailVerification({ userId: result.user.id, email: result.user.email });
    const destination = status.verified ? "/squadra" : emailVerificationPath("/squadra");
    if (!session?.user?.id) {
      await signIn("credentials", {
        email: result.user.email,
        password: parsed.data.password,
        redirectTo: destination,
      });
    }
    redirect(destination);
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("STAFF_INVITE_LOGIN_FAILED");
    }
    throw error;
  }
}

export async function deleteEditionAction(formData: FormData) {
  const { session } = await requireAdminActor();
  const id = String(formData.get("id") ?? "");
  const result = await deleteEditionAdmin(id);
  if (!result.ok) {
    redirect(id ? `/admin/edizioni/${id}` : "/admin/edizioni");
  }
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EDITION_DELETE",
    entityType: "Edition",
    entityId: id,
  });
  revalidatePath("/admin/edizioni");
  redirect("/admin/edizioni");
}

export async function deleteAccountAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | undefined> {
  const { session, actor } = await requireAdminActor();
  const parsed = deleteAccountSchema.safeParse({
    userId: formData.get("userId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!authorize(actor, "user:delete", { ownerUserId: parsed.data.userId }).allow) {
    return fail("LIFECYCLE_DELETE_FORBIDDEN");
  }
  const rateKey = await clientKey(`lifecycle:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.lifecycle.limit, RATE_LIMITS.lifecycle.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const result = await deleteUserAccount({
    userId: parsed.data.userId,
    confirm: parsed.data.confirm,
    actorUserId: session.user.id,
  });
  if (!result.ok) {
    return fail(result.code);
  }
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/audit");
  redirect("/admin/utenti?done=deleted");
}

export async function anonymizeAccountAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | undefined> {
  const { session, actor } = await requireAdminActor();
  const parsed = anonymizeAccountSchema.safeParse({
    userId: formData.get("userId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!authorize(actor, "user:anonymize", { ownerUserId: parsed.data.userId }).allow) {
    return fail("LIFECYCLE_ANONYMIZE_FORBIDDEN");
  }
  const rateKey = await clientKey(`lifecycle:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.lifecycle.limit, RATE_LIMITS.lifecycle.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const result = await anonymizeUserAccount({
    userId: parsed.data.userId,
    confirm: parsed.data.confirm,
    actorUserId: session.user.id,
  });
  if (!result.ok) {
    return fail(result.code);
  }
  revalidatePath("/admin/utenti");
  revalidatePath(`/admin/utenti/${parsed.data.userId}`);
  revalidatePath("/admin/audit");
  redirect(`/admin/utenti/${parsed.data.userId}?done=anonymized`);
}

export async function anonymizeSchoolAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | undefined> {
  const { session, actor } = await requireAdminActor();
  const parsed = schoolLifecycleSchema.safeParse({
    schoolId: formData.get("schoolId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (!authorize(actor, "user:anonymize").allow) return fail("LIFECYCLE_ANONYMIZE_FORBIDDEN");
  const rateKey = await clientKey(`lifecycle:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.lifecycle.limit, RATE_LIMITS.lifecycle.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const result = await anonymizeSchoolAccount({
    schoolId: parsed.data.schoolId,
    confirm: parsed.data.confirm,
    actorUserId: session.user.id,
  });
  if (!result.ok) return fail(result.code);
  revalidatePath("/admin/scuole");
  revalidatePath(`/admin/scuole/${parsed.data.schoolId}`);
  revalidatePath("/admin/squadre");
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/audit");
  redirect(`/admin/scuole/${parsed.data.schoolId}?done=anonymized`);
}

export async function deleteSchoolAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | undefined> {
  const { session, actor } = await requireAdminActor();
  const parsed = schoolLifecycleSchema.safeParse({
    schoolId: formData.get("schoolId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (!authorize(actor, "user:delete").allow) return fail("LIFECYCLE_DELETE_FORBIDDEN");
  const rateKey = await clientKey(`lifecycle:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.lifecycle.limit, RATE_LIMITS.lifecycle.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const result = await deleteSchoolAccount({
    schoolId: parsed.data.schoolId,
    confirm: parsed.data.confirm,
    actorUserId: session.user.id,
  });
  if (!result.ok) return fail(result.code);
  revalidatePath("/admin/scuole");
  revalidatePath("/admin/squadre");
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/audit");
  redirect("/admin/scuole?done=deleted");
}

export async function saveEditionDefaultFeesAction(
  _prev: ActionState<{ saved?: boolean }> | undefined,
  formData: FormData,
): Promise<ActionState<{ saved?: boolean }>> {
  const access = await requireFeeActor();
  if (!("session" in access)) return access;
  if (formData.get("confirm") !== "yes") return failValidation(itFeeConfirm());
  const editionId = String(formData.get("editionId") ?? "");
  const player = optionalFeeCents(String(formData.get("playerFee") ?? ""));
  const staff = parseEuroToCents(String(formData.get("staffFee") ?? ""));
  const team = optionalFeeCents(String(formData.get("teamFee") ?? ""));
  if (!player.ok || !staff.ok || !team.ok) return failValidation(itFeeInvalid());
  const edition = await getEditionAdmin(editionId);
  if (!edition) return fail("EDITION_NOT_FOUND");
  await saveEditionDefaultFees({
    editionId,
    playerFeeCents: player.cents,
    staffFeeCents: staff.cents,
    teamFeeCents: team.cents,
  });
  await writeAuditLog({
    actorUserId: access.session.user.id,
    action: "EDITION_FEES_UPDATE",
    entityType: "Edition",
    entityId: editionId,
    metadata: {
      playerFeeCents: player.cents,
      staffFeeCents: staff.cents,
      teamFeeCents: team.cents,
    },
  });
  revalidatePath(`/admin/edizioni/${editionId}`);
  revalidatePath(`/admin/edizioni/${editionId}/quote`);
  revalidatePath("/area");
  revalidatePath("/squadra");
  return { saved: true as const };
}

export async function saveTeamFeesAction(
  _prev: ActionState<{ saved?: boolean }> | undefined,
  formData: FormData,
): Promise<ActionState<{ saved?: boolean }>> {
  const access = await requireFeeActor();
  if (!("session" in access)) return access;
  if (formData.get("confirm") !== "yes") return failValidation(itFeeConfirm());
  const editionId = String(formData.get("editionId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const player = optionalFeeCents(String(formData.get("playerFee") ?? ""));
  const staff = optionalFeeCents(String(formData.get("staffFee") ?? ""));
  const team = optionalFeeCents(String(formData.get("teamFee") ?? ""));
  if (!player.ok || !staff.ok || !team.ok) return failValidation(itFeeInvalid());
  const saved = await saveTeamFeeOverrides({
    editionId,
    teamId,
    playerFeeCents: player.cents,
    staffFeeCents: staff.cents,
    teamFeeCents: team.cents,
  });
  if (!saved) return fail("TEAM_NOT_FOUND");
  await writeAuditLog({
    actorUserId: access.session.user.id,
    action: "TEAM_FEES_UPDATE",
    entityType: "Team",
    entityId: teamId,
    metadata: {
      editionId,
      playerFeeCents: player.cents,
      staffFeeCents: staff.cents,
      teamFeeCents: team.cents,
      previousPlayerFeeCents: saved.previous.playerFeeCents,
      previousStaffFeeCents: saved.previous.staffFeeCents,
      previousTeamFeeCents: saved.previous.teamFeeCents,
    },
  });
  revalidatePath(`/admin/edizioni/${editionId}/quote`);
  revalidatePath("/area");
  revalidatePath("/squadra");
  return { saved: true as const };
}

function itFeeInvalid() {
  return "Inserisci un importo in euro maggiore di zero, con al massimo due decimali.";
}

function itFeeConfirm() {
  return "Conferma le modifiche prima di salvare le quote.";
}
