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
import { decideRedeemPath, inviteCreateBlocker } from "@/features/teams/domain/invite";
import { parseBulkInviteCsv } from "@/features/teams/domain/bulk";
import { registrationReminder } from "@/features/teams/domain/reminder";
import { extractInviteToken, isWellFormedInviteToken } from "@/features/teams/domain/token";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { createNotification } from "@/features/notifications/data/notifications";
import {
  attachExistingUserToInvite,
  createAccountFromInvite,
  createPlayerInvite,
  findInviteByPlainToken,
  getPlayerInviteForTeam,
  getTeamForActor,
  loadRedeemContext,
  revokePlayerInvite,
} from "@/features/teams/data/invites";
import { updateMembershipRoster } from "@/features/teams/data/roster";
import { createInviteSchema, redeemInviteSchema } from "@/features/teams/schemas/invite";

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function createInviteAction(
  _prev: { error?: string; redeemUrl?: string } | undefined,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Devi accedere per invitare un giocatore." };
  }

  const actor = await getActorByUserId(session.user.id);
  if (!actor) return { error: "Account non trovato." };

  const parsed = createInviteSchema.safeParse({
    teamId: formData.get("teamId"),
    email: formData.get("email"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const decision = authorize(actor, "team:invite", { teamId: parsed.data.teamId });
  if (!decision.allow) {
    return { error: "Non puoi invitare giocatori in questa squadra." };
  }

  const team = await getTeamForActor(parsed.data.teamId);
  if (!team) {
    return { error: "Squadra non trovata." };
  }
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return { error: "Le iscrizioni di questa edizione non sono aperte adesso." };
  }

  const context = await loadRedeemContext(parsed.data.email);
  const blocker = inviteCreateBlocker(
    parsed.data.teamId,
    team.editionId,
    context.existingRegistrations,
  );
  if (blocker === "already_on_team") {
    return { error: "Questo giocatore è già in squadra." };
  }
  if (blocker === "edition_conflict") {
    return { error: "Questo giocatore è già iscritto a un’altra competizione." };
  }

  const rateKey = await clientKey(`invite:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteCreate.limit, RATE_LIMITS.inviteCreate.windowMs))) {
    return { error: "Troppi inviti in poco tempo. Riprova più tardi." };
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
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const token = extractInviteToken(String(formData.get("token") ?? ""));
  if (!token) {
    return { error: "Incolla il link o il codice che hai ricevuto dal rappresentante." };
  }
  redirect(`/invito/${token}`);
}

export async function redeemInviteAction(
  _prev: { error?: string } | undefined,
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
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }
  if (!isWellFormedInviteToken(parsed.data.token)) {
    return { error: "Questo invito non è valido." };
  }

  const rateKey = await clientKey("redeem");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteRedeem.limit, RATE_LIMITS.inviteRedeem.windowMs))) {
    return { error: "Troppi tentativi. Riprova più tardi." };
  }

  const found = await findInviteByPlainToken(parsed.data.token);
  if (!found || found.inspection.outcome !== "redeemable") {
    return { error: messageForInviteOutcome(found?.inspection.outcome ?? "invalid") };
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
    return { error: messageForRedeemPath(path.path) };
  }

  try {
    const result = await createAccountFromInvite(parsed.data);
    if (!result.ok) {
      return { error: messageForInviteOutcome(result.reason) };
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
      return { error: "Questo invito è già stato usato. Se hai già un account, accedi." };
    }
    if (error instanceof AuthError) {
      return { error: "Account creato, ma l'accesso automatico non è riuscito. Accedi dalla pagina di login." };
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
    return { error: "Questo invito non è valido." };
  }

  const found = await findInviteByPlainToken(token);
  if (!found || found.inspection.outcome !== "redeemable") {
    return { error: messageForInviteOutcome(found?.inspection.outcome ?? "invalid") };
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
    return { error: messageForRedeemPath(path.path) };
  }

  try {
    const result = await attachExistingUserToInvite({
      token,
      userId: session.user.id,
      email: session.user.email,
    });
    if (!result.ok) {
      return { error: messageForInviteOutcome(result.reason) };
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
      return { error: "Questo invito è già stato usato." };
    }
    throw error;
  }
}

function messageForInviteOutcome(outcome: string) {
  switch (outcome) {
    case "expired":
      return "Questo invito è scaduto. Chiedi un nuovo link al rappresentante di squadra.";
    case "already_used":
      return "Questo invito è già stato utilizzato. Se hai già un account, accedi.";
    case "revoked":
      return "Questo invito è stato annullato. Chiedi un nuovo link al rappresentante di squadra.";
    case "login_required":
      return "Esiste già un account con questa email. Accedi per unirti alla squadra.";
    default:
      return "Questo invito non è valido.";
  }
}

function messageForRedeemPath(path: string) {
  switch (path) {
    case "login_required":
      return "Esiste già un account con questa email. Accedi per unirti alla squadra.";
    case "wrong_session_email":
      return "Sei connesso con un account diverso da quello dell'invito. Esci e riprova.";
    case "edition_conflict":
      return "Sei già iscritto a un'altra competizione. Contatta l'organizzazione.";
    case "already_on_team":
      return "Sei già in questa squadra. Accedi alla tua area.";
    default:
      return "Non è possibile usare questo invito adesso.";
  }
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

async function requireTeamAction(teamId: string, action: "team:invite" | "team:update_roster" | "team:read") {
  const session = await auth();
  if (!session?.user?.id) return { error: "Devi accedere." as const };
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return { error: "Account non trovato." as const };
  if (!authorize(actor, action, { teamId }).allow) {
    return { error: "Non puoi gestire questa squadra." as const };
  }
  return { session, actor };
}

export async function selectTeamAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const access = await requireTeamAction(teamId, "team:read");
  if ("error" in access && access.error) return;
  const jar = await cookies();
  jar.set(TEAM_COOKIE, teamId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, httpOnly: true });
  revalidatePath("/squadra");
  revalidatePath("/squadra/inviti");
}

export async function resendInviteAction(
  _prev: { error?: string; redeemUrl?: string } | undefined,
  formData: FormData,
) {
  const teamId = String(formData.get("teamId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");
  const access = await requireTeamAction(teamId, "team:invite");
  if ("error" in access && access.error) return { error: access.error };
  const team = await getTeamForActor(teamId);
  if (!team) return { error: "Squadra non trovata." };
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return { error: "Le iscrizioni di questa edizione non sono aperte adesso." };
  }
  const existing = await getPlayerInviteForTeam(inviteId, teamId);
  if (!existing) return { error: "Invito non trovato." };
  const rateKey = await clientKey(`invite:${access.session!.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.inviteCreate.limit, RATE_LIMITS.inviteCreate.windowMs))) {
    return { error: "Troppi inviti in poco tempo. Riprova più tardi." };
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
  _prev: { error?: string; created?: number; errors?: { line: number; message: string }[] } | undefined,
  formData: FormData,
) {
  const teamId = String(formData.get("teamId") ?? "");
  const csv = String(formData.get("csv") ?? "");
  const access = await requireTeamAction(teamId, "team:invite");
  if ("error" in access && access.error) return { error: access.error };
  const team = await getTeamForActor(teamId);
  if (!team) return { error: "Squadra non trovata." };
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return { error: "Le iscrizioni di questa edizione non sono aperte adesso." };
  }
  const rateKey = await clientKey(`bulk-invite:${access.session!.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.bulkInvite.limit, RATE_LIMITS.bulkInvite.windowMs))) {
    return { error: "Troppi elenchi in poco tempo. Riprova più tardi." };
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
        message: `${row.email}: ${blocker === "already_on_team" ? "già in squadra" : "già iscritto a un’altra competizione"}.`,
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
  if ("error" in access && access.error) return;
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
  if ("error" in access && access.error) return;
  if (!membershipId) return;
  await updateMembershipRoster({ membershipId, teamId, jerseyNumber, rosterRole });
  revalidatePath("/squadra");
  revalidatePath("/area/squadra");
}
