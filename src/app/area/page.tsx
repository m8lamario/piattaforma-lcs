import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActorByUserId, isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { RegistrationDashboard } from "@/features/registrations/ui/Dashboard";
import { ButtonLink } from "@/shared/ui/Button";
import { AppShell } from "@/shared/ui/AppShell";
import { EmptyState } from "@/shared/ui/EmptyState";
import { it } from "@/shared/i18n/it";

export default async function AreaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/accedi");
  }

  const [actor, workspace] = await Promise.all([
    getActorByUserId(session.user.id),
    loadPlayerWorkspace(session.user.id),
  ]);
  const showTeam = actor ? representativeTeamIds(actor).length > 0 : false;
  const showAdmin = actor ? isStaff(actor) : false;

  if (workspace && workspace.projectedStatus !== workspace.registration.status) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }

  return (
    <AppShell email={session.user.email} showTeam={showTeam} showAdmin={showAdmin}>
      {workspace ? (
        <RegistrationDashboard
          competitionName={workspace.registration.competitionName}
          editionName={workspace.registration.editionName}
          teamName={workspace.registration.teamName}
          status={workspace.projectedStatus}
          checklist={workspace.checklist}
          medicalStatus={workspace.evidence.medicalStatus}
        />
      ) : (
        <EmptyState
          icon={showTeam ? "team" : "area"}
          title={it.areaTitle}
          action={
            showTeam ? (
              <ButtonLink href="/squadra">{it.navTeam}</ButtonLink>
            ) : showAdmin ? (
              <ButtonLink href="/admin/documenti">{it.navAdminDocuments}</ButtonLink>
            ) : undefined
          }
        >
          <p>{showTeam ? it.areaRepEmpty : showAdmin ? it.areaAdminEmpty : it.areaEmptyRegistration}</p>
        </EmptyState>
      )}
    </AppShell>
  );
}
