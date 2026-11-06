"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ADMIN_VIEW_COOKIE, ADMIN_VIEW_TTL_SECONDS } from "@/features/admin-view/domain/constants";
import { sealViewCookie, viewCookieSecret } from "@/features/admin-view/domain/cookie";
import { decideAdminViewStart, highestStaffRole } from "@/features/admin-view/domain/policy";
import { openAdminView, supersedeOpenViews } from "@/features/admin-view/data/sessions";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId, isMedicalReviewer, isStaff, isSuperAdmin, representativeTeamIds } from "@/shared/authz/getActor";
import type { Role } from "@/shared/authz/types";
import { fail, type ActionFailure } from "@/shared/errors";
import { closeAdminView, loadActiveAdminView } from "@/shared/lib/readOnlyGuard";
import { prisma } from "@/shared/lib/prisma";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { shouldUseSecureCookie } from "@/shared/cookies/options";
import { homeForShellFlags, shellNavFlags } from "@/shared/ui/shellNav";

function viewCookieOptions(secure: boolean, maxAge: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge,
    httpOnly: true,
    secure,
  };
}

async function landingFor(userId: string) {
  const actor = await getActorByUserId(userId);
  if (!actor) return "/area";
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: { registrations: { take: 1, select: { id: true } } },
  });
  return homeForShellFlags(
    shellNavFlags({
      isRepresentative: representativeTeamIds(actor).length > 0,
      isStaffOrReviewer: isStaff(actor) || isMedicalReviewer(actor),
      hasMembership: actor.membershipTeamIds.length > 0,
      hasPlayerRegistration: Boolean(profile?.registrations.length),
      canVerifyMedia: authorize(actor, "media:verify").allow,
      isSuperAdmin: isSuperAdmin(actor),
    }),
  );
}

export async function startAdminViewAction(
  _prev: void | ActionFailure | undefined,
  formData: FormData,
): Promise<void | ActionFailure> {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/utenti");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const decision = decideAdminViewStart({
    viewerCan: authorize(actor, "user:view_as").allow,
    sameUser: formData.get("userId") === session.user.id,
    targetActive: true,
    confirmed: formData.get("confirm") === "on",
  });
  if (!decision.ok && decision.reason === "forbidden") return fail("VIEW_FORBIDDEN");
  if (!decision.ok && decision.reason === "confirm") return fail("VIEW_CONFIRM_REQUIRED");
  if (!decision.ok && decision.reason === "self") return fail("VIEW_SELF");

  const targetUserId = String(formData.get("userId") ?? "");
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, lifecycleStatus: true, roles: { select: { role: true } } },
  });
  const finalDecision = decideAdminViewStart({
    viewerCan: authorize(actor, "user:view_as").allow,
    sameUser: target?.id === session.user.id,
    targetActive: target?.lifecycleStatus === "ACTIVE",
    confirmed: formData.get("confirm") === "on",
  });
  if (!finalDecision.ok) {
    if (finalDecision.reason === "self") return fail("VIEW_SELF");
    if (finalDecision.reason === "unavailable") return fail("VIEW_TARGET_UNAVAILABLE");
    if (finalDecision.reason === "confirm") return fail("VIEW_CONFIRM_REQUIRED");
    return fail("VIEW_TARGET_FORBIDDEN");
  }

  const rateKey = await clientKey(`admin-view:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.adminView.limit, RATE_LIMITS.adminView.windowMs))) {
    return fail("VIEW_RATE_LIMITED");
  }

  const adminRole = highestStaffRole(actor.roles.map((role) => role.role as Role));
  const trace = await userAgentAndIp();
  await supersedeOpenViews({ adminId: session.user.id, adminRole });
  const created = await openAdminView({
    adminId: session.user.id,
    adminRole,
    targetUserId: target!.id,
    trace,
  });

  const headerList = await headers();
  const jar = await cookies();
  jar.set(
    ADMIN_VIEW_COOKIE,
    sealViewCookie(
      {
        sessionId: created.id,
        adminId: session.user.id,
        targetUserId: target!.id,
        mode: "READ_ONLY",
        startedAt: created.startedAt.toISOString(),
        exp: Math.floor(created.expiresAt.getTime() / 1000),
      },
      viewCookieSecret(),
    ),
    viewCookieOptions(shouldUseSecureCookie(headerList.get("x-forwarded-proto")), ADMIN_VIEW_TTL_SECONDS),
  );

  redirect(await landingFor(target!.id));
}

export async function endAdminViewAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/utenti");
  const view = await loadActiveAdminView();
  if (!view || view.adminId !== session.user.id) redirect("/admin/utenti");
  await closeAdminView({
    sessionId: view.sessionId,
    adminId: view.adminId,
    adminRole: view.adminRole,
    reason: "MANUAL",
    startedAt: view.startedAt,
  });
  const headerList = await headers();
  const jar = await cookies();
  jar.set(ADMIN_VIEW_COOKIE, "", viewCookieOptions(shouldUseSecureCookie(headerList.get("x-forwarded-proto")), 0));
  redirect(`/admin/utenti/${view.targetUserId}`);
}

export async function clearAdminViewOnLogout(adminId: string) {
  const view = await loadActiveAdminView();
  if (view && view.adminId === adminId) {
    await closeAdminView({
      sessionId: view.sessionId,
      adminId: view.adminId,
      adminRole: view.adminRole,
      reason: "MANUAL",
      startedAt: view.startedAt,
    });
  }
  try {
    const headerList = await headers();
    const jar = await cookies();
    jar.set(ADMIN_VIEW_COOKIE, "", viewCookieOptions(shouldUseSecureCookie(headerList.get("x-forwarded-proto")), 0));
  } catch {
    return;
  }
}
