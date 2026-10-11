import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import type { Action } from "@/shared/authz/types";

export const requireStaff = cache(async (nextPath = "/admin") => {
  return requireAction(nextPath, "admin:manage");
});

export const requireAction = cache(async (nextPath: string, action: Action) => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }

  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const allowed = authorize(actor, action);
  if (!allowed.allow) redirect("/area");

  return { session, actor };
});

export const requireStaffOrReviewer = cache(async (nextPath = "/admin/documenti") => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const staff = authorize(actor, "admin:manage");
  const reviewer = authorize(actor, "document:review");
  if (!staff.allow && !reviewer.allow) redirect("/area");
  return { session, actor };
});
