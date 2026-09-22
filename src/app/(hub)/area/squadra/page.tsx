import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { listTeammates } from "@/features/teams/data/roster";
import { authorize } from "@/shared/authz/authorize";
import { TeammatesList } from "@/features/teams/ui/TeammatesList";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "../comunicazioni/page.module.css";

export default async function PlayerTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/squadra");
  const [shell, workspace] = await Promise.all([
    loadAppShell(session.user.id),
    loadPlayerWorkspace(session.user.id),
  ]);
  const teamId = workspace?.registration.teamId ?? shell.actor?.membershipTeamIds[0];
  if (!teamId || !shell.actor) redirect("/area");
  if (!authorize(shell.actor, "team:read", { teamId }).allow) redirect("/area");
  const rows = await listTeammates(teamId);

  return (
    <main className={styles.main}>
      <PageHeader title={it.navPlayerTeam} description={it.teammatesHelp} />
      <TeammatesList rows={rows} />
    </main>
  );
}
