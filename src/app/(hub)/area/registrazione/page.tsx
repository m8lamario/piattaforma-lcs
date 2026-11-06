import { redirect } from "next/navigation";
import { requirePageUser } from "@/shared/authz/requestIdentity";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { nextIncompleteStep } from "@/features/registrations/domain/wizard";

export default async function RegistrationIndexPage() {
  const identity = await requirePageUser("/area/registrazione");
  const workspace = await loadPlayerWorkspace(identity.subjectUserId);
  if (!workspace) redirect("/area");
  redirect(`/area/registrazione/${nextIncompleteStep(workspace.checklist)}`);
}
