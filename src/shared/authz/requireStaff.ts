import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";

export async function requireStaff(nextPath = "/admin") {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=${encodeURIComponent(nextPath)}`);
  }

  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const allowed = authorize(actor, "admin:manage");
  if (!allowed.allow) redirect("/area");

  return { session, actor };
}
