import { redirect } from "next/navigation";
import { requirePageUser } from "@/shared/authz/requestIdentity";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { listTeammates } from "@/features/teams/data/roster";
import { authorize } from "@/shared/authz/authorize";
import { TeammatesList } from "@/features/teams/ui/TeammatesList";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "../comunicazioni/page.module.css";

export default async function PlayerTeamPage() {
  const identity = await requirePageUser("/area/squadra");
  const shellPromise = loadAppShell(identity.subjectUserId);
  const workspacePromise = loadPlayerWorkspace(identity.subjectUserId);
  const shell = await shellPromise;
  if (shell.showTeam) redirect("/squadra");
  const membershipTeamId = shell.actor?.membershipTeamIds[0];
  const teammatesPromise = membershipTeamId ? listTeammates(membershipTeamId) : null;
  const workspace = await workspacePromise;
  const teamId = workspace?.registration.teamId ?? membershipTeamId;
  if (!teamId || !shell.actor) redirect("/area");
  if (!authorize(shell.actor, "team:read", { teamId }).allow) redirect("/area");
  const rows =
    teammatesPromise && teamId === membershipTeamId ? await teammatesPromise : await listTeammates(teamId);

  return (
    <main className={styles.main}>
      <PageHeader
        kicker={
          workspace
            ? `${workspace.registration.competitionName} · ${workspace.registration.editionName}`
            : undefined
        }
        title={workspace?.registration.teamName ?? it.navPlayerTeam}
        description={it.teammatesHelp}
      />
      <TeammatesList rows={rows} />
    </main>
  );
}
