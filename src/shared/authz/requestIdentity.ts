import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { ActiveAdminView } from "@/shared/lib/readOnlyGuard";
import { loadActiveAdminView } from "@/shared/lib/readOnlyGuard";
import type { Actor } from "./types";
import { getActorByUserId } from "./getActor";

export type RequestIdentity = {
  sessionUserId: string;
  sessionEmail: string | null;
  subjectUserId: string;
  subjectEmail: string | null;
  subjectActor: Actor;
  sessionActor: Actor;
  view: ActiveAdminView | null;
};

export const getRequestIdentity = cache(async (): Promise<RequestIdentity | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const sessionActor = await getActorByUserId(session.user.id);
  if (!sessionActor) return null;

  const view = await loadActiveAdminView();
  if (!view || view.adminId !== session.user.id) {
    return {
      sessionUserId: session.user.id,
      sessionEmail: session.user.email ?? null,
      subjectUserId: session.user.id,
      subjectEmail: session.user.email ?? null,
      subjectActor: sessionActor,
      sessionActor,
      view: null,
    };
  }

  const subjectActor = await getActorByUserId(view.targetUserId);
  if (!subjectActor) {
    return {
      sessionUserId: session.user.id,
      sessionEmail: session.user.email ?? null,
      subjectUserId: session.user.id,
      subjectEmail: session.user.email ?? null,
      subjectActor: sessionActor,
      sessionActor,
      view: null,
    };
  }

  return {
    sessionUserId: session.user.id,
    sessionEmail: session.user.email ?? null,
    subjectUserId: view.targetUserId,
    subjectEmail: view.targetEmail,
    subjectActor,
    sessionActor,
    view,
  };
});

export async function requirePageUser(nextPath: string) {
  const identity = await getRequestIdentity();
  if (!identity) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }
  return identity;
}
