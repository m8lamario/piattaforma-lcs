"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId, representativeTeamIds } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";
import { logger } from "@/shared/lib/logger";
import { emailAdapter } from "@/shared/adapters";
import { BULK_INVITE_MAX, TEAM_COOKIE } from "@/shared/config/app";
import {
  RATE_LIMITS,
  clientKey,
  consumeRateLimit,
  userAgentAndIp,
} from "@/shared/lib/request-guard";
import {
  decideRedeemPath,
  decideTeamJoinPath,
  inviteCreateBlocker,
  inviteCreateBlockerCode,
  inviteOutcomeCode,
  redeemPathCode,
} from "@/features/teams/domain/invite";
import { fail, failValidation, userMessage, type ActionFailure, type ActionState } from "@/shared/errors";
import { parseBulkInviteCsv } from "@/features/teams/domain/bulk";
import { registrationReminder } from "@/features/teams/domain/reminder";
import { extractInviteToken, isWellFormedInviteToken } from "@/features/teams/domain/token";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { createNotification } from "@/features/notifications/data/notifications";
import {
  attachExistingUserToInvite,
  attachExistingUserToTeamLink,
  createAccountFromInvite,
  createAccountFromTeamLink,
  createPlayerInvite,
  findInviteByPlainToken,
  findTeamByRegistrationToken,
  getPlayerInviteForTeam,
  getTeamForActor,
  loadRedeemContext,
  revokePlayerInvite,
} from "@/features/teams/data/invites";
import { updateMembershipRoster } from "@/features/teams/data/roster";
import { createInviteSchema, joinTeamSchema, redeemInviteSchema } from "@/features/teams/schemas/invite";
import { removePlayerFromTeam } from "@/features/admin/data/lifecycle";
import { removePlayerSchema } from "@/features/admin/schemas/lifecycle";

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function createInviteAction(
  _prev: ActionState<{ redeemUrl?: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ redeemUrl?: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("AUTH_SESSION_REQUIRED");
  }

  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");

  const parsed = createInviteSchema.safeParse({
    teamId: formData.get("teamId"),
    email: formData.get("email"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }

  const decision = authorize(actor, "team:invite", { teamId: parsed.data.teamId });
  if (!decision.allow) {
    return fail("FORBIDDEN_TEAM_INVITE");
  }

  const team = await getTeamForActor(parsed.data.teamId);
  if (!team) {
    return fail("TEAM_NOT_FOUND");
  }
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }

  const context = await loadRedeemContext(parsed.data.email);
  const blocker = inviteCreateBlocker(
    parsed.data.teamId,
    team.editionId,
    context.existingRegistrations,
  );
  if (blocker) {
    return fail(inviteCreateBlockerCode(blocker));
  }

  const rateKey = await clientKey(`invite:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteCreate.limit, RATE_LIMITS.inviteCreate.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }

  const headerList = await headers();
  const { invite, redeemUrl } = await createPlayerInvite({
    ...parsed.data,
    invitedByUserId: session.user.id,
    origin: originFromHeaders(headerList),
  });

  await emailAdapter.send({
    to: parsed.data.email,
    template: "player-invite",
    variables: {
      teamName: invite.team.name,
      redeemUrl,
    },
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "INVITE_CREATE",
    entityType: "PlayerInvite",
    entityId: invite.id,
    metadata: { teamId: invite.teamId },
    ...trace,
  });

  logger.info("invite.created", { teamId: invite.teamId, userId: session.user.id });
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
  return { redeemUrl };
}

export async function revokeInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi");

  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const teamId = String(formData.get("teamId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!teamId || !inviteId) return;

  const decision = authorize(actor, "team:invite", { teamId });
  if (!decision.allow) return;

  const revoked = await revokePlayerInvite(inviteId, teamId);
  if (revoked) {
    const trace = await userAgentAndIp();
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "INVITE_REVOKE",
      entityType: "PlayerInvite",
      entityId: inviteId,
      metadata: { teamId },
      ...trace,
    });
    revalidatePath("/squadra");
    revalidatePath("/squadra/inviti");
  }
}

export async function submitInviteTokenAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const token = extractInviteToken(String(formData.get("token") ?? ""));
  if (!token) {
    return fail("INVITE_TOKEN_MALFORMED");
  }
  redirect(`/invito/${token}`);
}

export async function redeemInviteAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const parsed = redeemInviteSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!isWellFormedInviteToken(parsed.data.token)) {
    return fail("INVITE_INVALID");
  }

  const rateKey = await clientKey("redeem");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteRedeem.limit, RATE_LIMITS.inviteRedeem.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }

  const found = await findInviteByPlainToken(parsed.data.token);
  if (!found || found.inspection.outcome !== "redeemable") {
    return fail(inviteOutcomeCode(found?.inspection.outcome ?? "invalid"));
  }

  const session = await auth();
  const context = await loadRedeemContext(found.inspection.email);
  const path = decideRedeemPath({
    inspection: found.inspection,
    existingUser: context.existingUser,
    session: session?.user?.id
      ? { userId: session.user.id, email: session.user.email ?? "" }
      : null,
    existingRegistrations: context.existingRegistrations,
  });

  if (path.path !== "create_account") {
    return fail(redeemPathCode(path.path));
  }

  try {
    const result = await createAccountFromInvite(parsed.data);
    if (!result.ok) {
      return fail(inviteOutcomeCode(result.reason));
    }

    const trace = await userAgentAndIp();
    await writeAuditLog({
      actorUserId: result.user.id,
      action: "INVITE_REDEEM",
      entityType: "User",
      entityId: result.user.id,
      metadata: { teamName: result.teamName },
      ...trace,
    });

    await signIn("credentials", {
      email: result.user.email,
      password: parsed.data.password,
      redirectTo: "/area",
    });
    return {};
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_RACE") {
      return fail("INVITE_ALREADY_USED");
    }
    if (error instanceof AuthError) {
      return fail("AUTH_ACCOUNT_CREATED_LOGIN_FAILED");
    }
    throw error;
  }
}

export async function attachInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect(`/accedi?next=${encodeURIComponent(`/invito/${token}`)}`);
  }

  if (!isWellFormedInviteToken(token)) {
    return fail("INVITE_INVALID");
  }

  const found = await findInviteByPlainToken(token);
  if (!found || found.inspection.outcome !== "redeemable") {
    return fail(inviteOutcomeCode(found?.inspection.outcome ?? "invalid"));
  }

  const context = await loadRedeemContext(found.inspection.email);
  const path = decideRedeemPath({
    inspection: found.inspection,
    existingUser: context.existingUser,
    session: { userId: session.user.id, email: session.user.email },
    existingRegistrations: context.existingRegistrations,
  });

  if (path.path === "already_on_team") {
    redirect("/area");
  }
  if (path.path !== "attach_existing") {
    return fail(redeemPathCode(path.path));
  }

  try {
    const result = await attachExistingUserToInvite({
      token,
      userId: session.user.id,
      email: session.user.email,
    });
    if (!result.ok) {
      return fail(inviteOutcomeCode(result.reason));
    }
    const trace = await userAgentAndIp();
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "INVITE_ATTACH",
      entityType: "PlayerInvite",
      entityId: found.invite.id,
      ...trace,
    });
    redirect("/area");
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_RACE") {
      return fail("INVITE_ALREADY_USED");
    }
    throw error;
  }
}

export async function joinTeamAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
) {
  const parsed = joinTeamSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  if (!isWellFormedInviteToken(parsed.data.token)) {
    return fail("INVITE_INVALID");
  }

  const rateKey = await clientKey("redeem");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteRedeem.limit, RATE_LIMITS.inviteRedeem.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }

  const team = await findTeamByRegistrationToken(parsed.data.token);
  if (!team) return fail("INVITE_INVALID");
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }

  const session = await auth();
  const context = await loadRedeemContext(parsed.data.email);
  const path = decideTeamJoinPath({
    email: parsed.data.email,
    teamId: team.id,
    editionId: team.editionId,
    existingUser: context.existingUser,
    session: session?.user?.id
      ? { userId: session.user.id, email: session.user.email ?? "" }
      : null,
    existingRegistrations: context.existingRegistrations,
  });
  if (path.path !== "create_account") {
    return fail(redeemPathCode(path.path));
  }

  try {
    const result = await createAccountFromTeamLink(parsed.data);
    if (!result.ok) return fail(inviteOutcomeCode(result.reason));

    const trace = await userAgentAndIp();
    await writeAuditLog({
      actorUserId: result.user.id,
      action: "TEAM_LINK_JOIN",
      entityType: "Team",
      entityId: result.teamId,
      metadata: { teamName: result.teamName },
      ...trace,
    });

    await signIn("credentials", {
      email: result.user.email,
      password: parsed.data.password,
      redirectTo: "/area",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("AUTH_ACCOUNT_CREATED_LOGIN_FAILED");
    }
    throw error;
  }
}

export async function attachTeamLinkAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect(`/accedi?next=${encodeURIComponent(`/iscrizione/${token}`)}`);
  }
  if (!isWellFormedInviteToken(token)) return fail("INVITE_INVALID");

  const rateKey = await clientKey("redeem");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteRedeem.limit, RATE_LIMITS.inviteRedeem.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }

  const team = await findTeamByRegistrationToken(token);
  if (!team) return fail("INVITE_INVALID");
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }

  const context = await loadRedeemContext(session.user.email);
  const path = decideTeamJoinPath({
    email: session.user.email,
    teamId: team.id,
    editionId: team.editionId,
    existingUser: context.existingUser,
    session: { userId: session.user.id, email: session.user.email },
    existingRegistrations: context.existingRegistrations,
  });
  if (path.path === "already_on_team") redirect("/area");
  if (path.path !== "attach_existing") return fail(redeemPathCode(path.path));

  const result = await attachExistingUserToTeamLink({
    token,
    userId: session.user.id,
    email: session.user.email,
  });
  if (!result.ok) return fail(inviteOutcomeCode(result.reason));

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEAM_LINK_JOIN",
    entityType: "Team",
    entityId: result.teamId,
    metadata: { teamName: result.teamName },
    ...trace,
  });
  redirect("/area");
}

async function requireTeamAction(
  teamId: string,
  action: "team:invite" | "team:update_roster" | "team:read" | "team:remove_player",
) {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return fail("AUTH_ACCOUNT_MISSING");
  if (!authorize(actor, action, { teamId }).allow) {
    return fail("FORBIDDEN_TEAM_MANAGE");
  }
  return { session, actor };
}

export async function requireRepresentativeTeamId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/squadra");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const teamIds = representativeTeamIds(actor);
  if (teamIds.length === 0 && !actor.roles.some((role) => role.role === "ORGANIZATION_ADMIN" || role.role === "SUPER_ADMIN")) {
    redirect("/area");
  }
  return { actor, session, teamIds };
}

function isDenied(
  access: ActionFailure | { session: { user?: { id?: string | null } | null } },
): access is ActionFailure {
  return "code" in access;
}

export async function selectTeamAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const access = await requireTeamAction(teamId, "team:read");
  if (isDenied(access)) return;
  const jar = await cookies();
  jar.set(TEAM_COOKIE, teamId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, httpOnly: true });
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
}

export async function resendInviteAction(
  _prev: ActionState<{ redeemUrl?: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ redeemUrl?: string }>> {
  const teamId = String(formData.get("teamId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");
  const access = await requireTeamAction(teamId, "team:invite");
  if (isDenied(access)) return access;
  const team = await getTeamForActor(teamId);
  if (!team) return fail("TEAM_NOT_FOUND");
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }
  const existing = await getPlayerInviteForTeam(inviteId, teamId);
  if (!existing) return fail("INVITE_NOT_FOUND");
  const rateKey = await clientKey(`invite:${access.session!.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteCreate.limit, RATE_LIMITS.inviteCreate.windowMs))) {
    return fail("INVITE_RATE_LIMITED");
  }
  const headerList = await headers();
  const { invite, redeemUrl } = await createPlayerInvite({
    teamId,
    email: existing.email,
    firstName: existing.firstName ?? undefined,
    lastName: existing.lastName ?? undefined,
    invitedByUserId: access.session!.user!.id,
    origin: originFromHeaders(headerList),
  });
  await emailAdapter.send({
    to: existing.email,
    template: "player-invite",
    variables: { teamName: invite.team.name, redeemUrl },
  });
  await writeAuditLog({
    actorUserId: access.session!.user!.id,
    action: "INVITE_RESEND",
    entityType: "PlayerInvite",
    entityId: invite.id,
    metadata: { teamId, previousInviteId: inviteId },
  });
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
  return { redeemUrl };
}

export async function bulkInviteAction(
  _prev: ActionState<{ created?: number; errors?: { line: number; message: string }[] }> | undefined,
  formData: FormData,
): Promise<ActionState<{ created?: number; errors?: { line: number; message: string }[] }>> {
  const teamId = String(formData.get("teamId") ?? "");
  const csv = String(formData.get("csv") ?? "");
  const access = await requireTeamAction(teamId, "team:invite");
  if (isDenied(access)) return access;
  const team = await getTeamForActor(teamId);
  if (!team) return fail("TEAM_NOT_FOUND");
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }
  const rateKey = await clientKey(`bulk-invite:${access.session!.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.bulkInvite.limit, RATE_LIMITS.bulkInvite.windowMs))) {
    return fail("TEAM_BULK_RATE_LIMITED");
  }
  const parsed = parseBulkInviteCsv(csv, BULK_INVITE_MAX);
  const headerList = await headers();
  const origin = originFromHeaders(headerList);
  let created = 0;
  const errors = [...parsed.errors];
  for (const row of parsed.rows) {
    const context = await loadRedeemContext(row.email);
    const blocker = inviteCreateBlocker(teamId, team.editionId, context.existingRegistrations);
    if (blocker) {
      errors.push({
        line: 0,
        message: `${row.email}: ${blocker === "already_on_team" ? userMessage("TEAM_PLAYER_ALREADY_ON_TEAM") : userMessage("TEAM_EDITION_CONFLICT")}`,
      });
      continue;
    }
    const { invite, redeemUrl } = await createPlayerInvite({
      teamId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      invitedByUserId: access.session!.user!.id,
      origin,
    });
    await emailAdapter.send({
      to: row.email,
      template: "player-invite",
      variables: { teamName: invite.team.name, redeemUrl },
    });
    created += 1;
  }
  await writeAuditLog({
    actorUserId: access.session!.user!.id,
    action: "INVITE_BULK",
    entityType: "Team",
    entityId: teamId,
    metadata: { created, errors: errors.length },
  });
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
  return { created, errors };
}

export async function nudgeRegistrationAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const access = await requireTeamAction(teamId, "team:invite");
  if (isDenied(access)) return;
  const workspace = await loadPlayerWorkspace(userId);
  if (!workspace || workspace.registration.teamId !== teamId) return;
  const pending = workspace.checklist
    .filter((item) => item.status === "todo" || item.status === "attention")
    .map((item) => item.code);
  const message = registrationReminder(pending);
  await createNotification({
    userId,
    type: message.type,
    title: message.title,
    body: message.body,
  });
  await writeAuditLog({
    actorUserId: access.session!.user!.id,
    action: "REGISTRATION_REMINDER",
    entityType: "User",
    entityId: userId,
    metadata: { teamId },
  });
  revalidatePath("/squadra");
}

export async function updateRosterRowAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const rosterRole = String(formData.get("rosterRole") ?? "").trim() || null;
  const access = await requireTeamAction(teamId, "team:update_roster");
  if (isDenied(access)) return;
  if (!membershipId) return;
  await updateMembershipRoster({ membershipId, teamId, jerseyNumber, rosterRole });
  revalidatePath("/squadra");
  revalidatePath("/area/squadra");
}

export async function removePlayerAction(
  _prev: ActionFailure | { ok: true } | undefined,
  formData: FormData,
): Promise<ActionFailure | { ok: true }> {
  const parsed = removePlayerSchema.safeParse({
    teamId: formData.get("teamId"),
    membershipId: formData.get("membershipId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }
  const access = await requireTeamAction(parsed.data.teamId, "team:remove_player");
  if (isDenied(access)) {
    if (access.code === "FORBIDDEN_TEAM_MANAGE") return fail("LIFECYCLE_REMOVE_FORBIDDEN");
    return access;
  }
  const rateKey = await clientKey(`lifecycle:${access.session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.lifecycle.limit, RATE_LIMITS.lifecycle.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const result = await removePlayerFromTeam({
    teamId: parsed.data.teamId,
    membershipId: parsed.data.membershipId,
    confirm: parsed.data.confirm,
    actorUserId: access.session.user!.id,
  });
  if (!result.ok) {
    return fail(result.code);
  }
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
  revalidatePath("/area");
  revalidatePath("/area/squadra");
  revalidatePath("/admin/registrazioni");
  return { ok: true as const };
}
