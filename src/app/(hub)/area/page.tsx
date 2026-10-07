import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { maybeSendC1Reminder } from "@/features/consents/data/tokens";
import { maybeSendGuardianReminder } from "@/features/consents/data/guardianAuth";
import { EmailVerifyNotice } from "@/features/auth/ui/EmailVerifyNotice";
import { listUnreadNotifications } from "@/features/notifications/data/notifications";
import { loadPlayerWorkspace, persistRegistrationStatus } from "@/features/registrations/data/workspace";
import { RegistrationDashboard } from "@/features/registrations/ui/Dashboard";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { teamCheckoutAmount } from "@/features/payments/domain/amounts";
import { getTeamForActor } from "@/features/teams/data/invites";
import { listTeamRoster, listTeamsByIds } from "@/features/teams/data/roster";
import { summarizeRoster } from "@/features/teams/domain/roster";
import { resolveSelectedTeamId } from "@/features/teams/domain/selection";
import { RepresentativeDashboard } from "@/features/teams/ui/RepresentativeDashboard";
import { authorize } from "@/shared/authz/authorize";
import { representativeTeamIds } from "@/shared/authz/getActor";
import { appOrigin, TEAM_COOKIE } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { ButtonLink } from "@/shared/ui/Button";
import { loadAppShell } from "@/shared/ui/loadAppShell";
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
  if (workspace) {
    void maybeSendC1Reminder(workspace.registration.id).catch(() => undefined);
    void maybeSendGuardianReminder(workspace.registration.id).catch(() => undefined);
  }

  if (shell.showTeam && shell.actor) {
    const teamIds = representativeTeamIds(shell.actor);
    const jar = await cookies();
    const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
    if (teamId) {
      const [team, teamPayment, roster, teams, unread] = await Promise.all([
        getTeamForActor(teamId),
        prisma.payment.findFirst({ where: { teamId, registrationId: null, status: "SUCCEEDED" } }),
        listTeamRoster(teamId),
        listTeamsByIds(teamIds),
        listUnreadNotifications(session.user.id),
      ]);
      if (
        team &&
        authorize(shell.actor, "team:read", {
          teamId: team.id,
          competitionId: team.edition.competitionId,
        }).allow
      ) {
        const editionWindow = {
          isActive: team.edition.isActive,
          registrationOpensAt: team.edition.registrationOpensAt,
          registrationClosesAt: team.edition.registrationClosesAt,
        };
        const teamAmount = teamCheckoutAmount({
          paymentMode: team.edition.paymentMode,
          teamFeeAmount: team.edition.teamFeeAmount,
        });
        return (
          <>
            {workspace && !workspace.user.emailVerified ? <EmailVerifyNotice /> : null}
            <RepresentativeDashboard
              schoolName={team.school.name}
              schoolCity={team.school.city}
              teamName={team.name}
              teamId={team.id}
              competitionName={team.edition.competition.name}
              editionName={team.edition.name}
              joinUrl={`${appOrigin()}/iscrizione/${team.registrationToken}`}
              windowOpen={isRegistrationWindowOpen(editionWindow)}
              editionWindow={editionWindow}
              counts={summarizeRoster(roster)}
              roster={roster}
              teams={teams}
              teamPaymentDue={teamAmount !== null && !teamPayment}
              unreadCount={shell.unreadCount}
              unread={unread}
              workspace={workspace}
            />
          </>
        );
      }
    }

    return (
      <EmptyState icon="team" title={it.areaOverviewTitle}>
        <p>{it.areaRepEmpty}</p>
      </EmptyState>
    );
  }

  if (workspace) {
    return (
      <>
        {!workspace.user.emailVerified ? <EmailVerifyNotice /> : null}
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
          identityConflict={workspace.identityConflict}
        />
      </>
    );
  }

  return (
    <EmptyState
      icon="area"
      title={it.areaTitle}
      action={shell.showAdmin ? <ButtonLink href="/admin">{it.navAdmin}</ButtonLink> : undefined}
    >
      <p>{shell.showAdmin ? it.areaAdminEmpty : it.areaEmptyRegistration}</p>
    </EmptyState>
  );
}
