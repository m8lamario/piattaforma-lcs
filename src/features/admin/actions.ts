"use server";

import { headers } from "next/headers";
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
import { emailAdapter } from "@/shared/adapters";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { fail, failValidation, type ActionFailure, type ActionState } from "@/shared/errors";
import { anonymizeUserAccount, deleteUserAccount } from "@/features/admin/data/lifecycle";
import { anonymizeAccountSchema, deleteAccountSchema } from "@/features/admin/schemas/lifecycle";

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

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
  const { session } = await requireAdminActor();
  const parsed = editionFormSchema.safeParse({
    competitionName: formData.get("competitionName"),
    editionName: formData.get("editionName"),
    year: formData.get("year"),
    paymentMode: formData.get("paymentMode"),
    playerFeeAmount: formData.get("playerFeeAmount") || undefined,
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
    playerFeeAmount: parseOptionalAmount(parsed.data.playerFeeAmount),
    teamFeeAmount: parseOptionalAmount(parsed.data.teamFeeAmount),
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
  const { session } = await requireAdminActor();
  const id = String(formData.get("id") ?? "");
  const existing = await getEditionAdmin(id);
  if (!existing) return fail("EDITION_NOT_FOUND");
  const parsed = editionFormSchema.safeParse({
    competitionName: existing.competition.name,
    editionName: formData.get("editionName"),
    year: formData.get("year"),
    paymentMode: formData.get("paymentMode"),
    playerFeeAmount: formData.get("playerFeeAmount") || undefined,
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
    playerFeeAmount: parseOptionalAmount(parsed.data.playerFeeAmount),
    teamFeeAmount: parseOptionalAmount(parsed.data.teamFeeAmount),
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
  const headerList = await headers();
  const { invite, redeemUrl } = await createStaffInvite({
    ...parsed.data,
    invitedByUserId: session.user.id,
    origin: originFromHeaders(headerList),
  });
  await emailAdapter.send({
    to: parsed.data.email,
    template: "staff-invite",
    variables: { teamName: invite.team.name, redeemUrl },
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
    if (!session?.user?.id) {
      await signIn("credentials", {
        email: result.user.email,
        password: parsed.data.password,
        redirectTo: "/squadra",
      });
    }
    redirect("/squadra");
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
