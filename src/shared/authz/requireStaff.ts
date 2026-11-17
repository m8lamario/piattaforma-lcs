import { cache } from "react";
import { redirect } from "next/navigation";
import { authorize } from "@/shared/authz/authorize";
import { deniedHome, isLeagueSupervisorRole, isMedicalReviewer, isStaff } from "@/shared/authz/getActor";
import { getRequestIdentity } from "@/shared/authz/requestIdentity";
import type { Action } from "@/shared/authz/types";

function sessionOf(identity: NonNullable<Awaited<ReturnType<typeof getRequestIdentity>>>) {
  return {
    user: {
      id: identity.sessionUserId,
      email: identity.sessionEmail,
    },
  };
}

export const requireStaff = cache(async (nextPath = "/admin") => {
  return requireAction(nextPath, "admin:manage");
});

export const requireAction = cache(async (nextPath: string, action: Action) => {
  const identity = await getRequestIdentity();
  if (!identity) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }

  const actor = identity.subjectActor;
  const allowed = authorize(actor, action);
  if (!allowed.allow) redirect(deniedHome(actor));

  return { session: sessionOf(identity), actor, identity };
});

export const requireMediaPartner = cache(async (nextPath = "/media") => {
  const identity = await getRequestIdentity();
  if (!identity) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }

  const actor = identity.subjectActor;
  const allowed = authorize(actor, "media:verify");
  if (allowed.allow) {
    return { session: sessionOf(identity), actor, identity, suspended: false as const };
  }

  if (actor.mediaPartner) {
    return { session: sessionOf(identity), actor, identity, suspended: true as const };
  }

  redirect(deniedHome(actor));
});

export const requireStaffOrReviewer = cache(async (nextPath = "/admin/documenti") => {
  const identity = await getRequestIdentity();
  if (!identity) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }
  const actor = identity.subjectActor;
  const staff = authorize(actor, "admin:manage");
  const reviewer = authorize(actor, "document:review");
  if (!staff.allow && !reviewer.allow) redirect(deniedHome(actor));
  return { session: sessionOf(identity), actor, identity };
});

export const requireLeagueAccount = cache(async (nextPath = "/lega") => {
  const identity = await getRequestIdentity();
  if (!identity) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }
  const actor = identity.subjectActor;
  if (!isLeagueSupervisorRole(actor)) {
    if (isStaff(actor) || isMedicalReviewer(actor)) redirect("/admin");
    if (authorize(actor, "media:verify").allow) redirect("/media");
    redirect("/area");
  }
  return { session: sessionOf(identity), actor, identity };
});

export const requireLeagueSupervisor = cache(async (nextPath = "/lega") => {
  const { session, actor, identity } = await requireLeagueAccount(nextPath);
  const editionId = actor.leagueEditionId;
  if (!editionId || !authorize(actor, "league:read", { editionId }).allow) {
    redirect("/lega");
  }
  return { session, actor, identity, editionId };
});
