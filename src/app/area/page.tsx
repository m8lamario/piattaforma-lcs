import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadPlayerWorkspace, persistRegistrationStatus } from "@/features/registrations/data/workspace";
import { RegistrationDashboard } from "@/features/registrations/ui/Dashboard";
import { ButtonLink } from "@/shared/ui/Button";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { AppShell } from "@/shared/ui/AppShell";
import { EmptyState } from "@/shared/ui/EmptyState";
import { it } from "@/shared/i18n/it";

export default async function AreaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/accedi");
  }

  const [shell, workspace] = await Promise.all([
    loadAppShell(session.user.id),
    loadPlayerWorkspace(session.user.id),
  ]);

  if (workspace && workspace.projectedStatus !== workspace.registration.status) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }

  return (
    <AppShell
      email={session.user.email}
      showTeam={shell.showTeam}
      showAdmin={shell.showAdmin}
      showPlayerTeam={shell.showPlayerTeam}
      unreadCount={shell.unreadCount}
    >
      {workspace ? (
        <RegistrationDashboard
          competitionName={workspace.registration.competitionName}
          editionName={workspace.registration.editionName}
          teamName={workspace.registration.teamName}
          status={workspace.projectedStatus}
          checklist={workspace.checklist}
          medicalStatus={workspace.evidence.medicalStatus}
          registrationId={workspace.registration.id}
          editionWindow={{
            isActive: workspace.registration.isActive,
            registrationOpensAt: workspace.registration.registrationOpensAt,
            registrationClosesAt: workspace.registration.registrationClosesAt,
          }}
        />
      ) : (
        <EmptyState
          icon={shell.showTeam ? "team" : "area"}
          title={it.areaTitle}
          action={
            shell.showTeam ? (
              <ButtonLink href="/squadra">{it.navTeam}</ButtonLink>
            ) : shell.showAdmin ? (
              <ButtonLink href="/admin">{it.navAdmin}</ButtonLink>
            ) : undefined
          }
        >
          <p>{shell.showTeam ? it.areaRepEmpty : shell.showAdmin ? it.areaAdminEmpty : it.areaEmptyRegistration}</p>
        </EmptyState>
      )}
    </AppShell>
  );
}
