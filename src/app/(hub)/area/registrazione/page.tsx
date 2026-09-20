import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { nextIncompleteStep } from "@/features/registrations/domain/wizard";

export default async function RegistrationIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) redirect("/area");
  redirect(`/area/registrazione/${nextIncompleteStep(workspace.checklist)}`);
}
