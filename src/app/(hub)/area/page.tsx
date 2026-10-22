import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { maybeSendC1Reminder } from "@/features/consents/data/tokens";
import { maybeSendGuardianReminder } from "@/features/consents/data/guardianAuth";
import { EmailVerifyNotice } from "@/features/auth/ui/EmailVerifyNotice";
import { listUnreadNotifications } from "@/features/notifications/data/notifications";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
  type PlayerWorkspace,
} from "@/features/registrations/data/workspace";
import { RegistrationDashboard } from "@/features/registrations/ui/Dashboard";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { applyPendingSnapshot, decimalToCents, resolveTeamFee } from "@/features/payments/domain/fees";
import { getTeamForActor } from "@/features/teams/data/invites";
import { listTeamRoster, listTeamsByIds } from "@/features/teams/data/roster";
import { splitRoster, summarizeRoster } from "@/features/teams/domain/roster";
import { staffOccupiesSlot, teamCoachCompleteness } from "@/features/teams/domain/staff";
import { LiveRefresh } from "@/features/teams/ui/LiveRefresh";
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

function scheduleWorkspaceFollowUp(workspace: PlayerWorkspace | null) {
  if (!workspace) return;
  after(async () => {
    if (workspace.projectedStatus !== workspace.registration.status) {
      await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
    }
    await Promise.all([
      maybeSendC1Reminder(workspace.registration.id).catch(() => undefined),
      maybeSendGuardianReminder(workspace.registration.id).catch(() => undefined),
    ]);
  });
}

export default async function AreaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/accedi");
  }

  const userId = session.user.id;
  const shellPromise = loadAppShell(userId);
  const workspacePromise = loadPlayerWorkspace(userId);

  const shell = await shellPromise;
  if (!shell.showArea && shell.showAdmin) {
    redirect("/admin");
  }
  if (shell.showMedia && !shell.showArea) {
    redirect("/media");
  }
  if (shell.showTeam && shell.actor) {
    const teamIds = representativeTeamIds(shell.actor);
    const jar = await cookies();
    const teamId = resolveSelectedTeamId(teamIds, jar.get(TEAM_COOKIE)?.value);
    if (teamId) {
      const [workspace, team, teamPayment, pendingTeamPayment, roster, teams, unread] = await Promise.all([
        workspacePromise,
        getTeamForActor(teamId),
        prisma.payment.findFirst({ where: { teamId, registrationId: null, status: "SUCCEEDED" }, select: { id: true } }),
        prisma.payment.findFirst({
          where: { teamId, registrationId: null, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: { amount: true },
        }),
        listTeamRoster(teamId),
        listTeamsByIds(teamIds),
        listUnreadNotifications(userId),
      ]);
      scheduleWorkspaceFollowUp(workspace);
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
        const teamFee = applyPendingSnapshot(
          decimalToCents(pendingTeamPayment?.amount),
          resolveTeamFee({
            paymentMode: team.edition.paymentMode,
            teamFeeCents: team.teamFeeCents,
            editionTeamFee: team.edition.teamFeeAmount,
          }),
        );
        const parts = splitRoster(roster);
        const coach = teamCoachCompleteness({
          teamId: team.id,
          coachRegistrationId: team.coachRegistrationId,
          coach: team.coachRegistration,
        });
        const own = roster.find((row) => row.userId === userId);
        const activeOwn = own && staffOccupiesSlot(own.registrationStatus) ? own : null;
        return (
          <>
            <LiveRefresh />
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
              counts={summarizeRoster(parts.players)}
              roster={parts.players}
              teams={teams}
              teamPaymentDue={teamFee.status === "ready" && !teamPayment}
              unreadCount={shell.unreadCount}
              unread={unread}
              workspace={workspace}
              staffUsed={parts.staffUsed}
              coachMissing={!coach.complete}
              coachName={
                coach.complete
                  ? `${team.coachRegistration?.playerProfile.firstName ?? ""} ${team.coachRegistration?.playerProfile.lastName ?? ""}`.trim()
                  : null
              }
              canChooseRole={!activeOwn && isRegistrationWindowOpen(editionWindow)}
              activeCategory={activeOwn?.category ?? null}
            />
          </>
        );
      }
      return (
        <EmptyState icon="team" title={it.areaOverviewTitle}>
          <p>{it.areaRepEmpty}</p>
        </EmptyState>
      );
    }

    scheduleWorkspaceFollowUp(await workspacePromise);
    return (
      <EmptyState icon="team" title={it.areaOverviewTitle}>
        <p>{it.areaRepEmpty}</p>
      </EmptyState>
    );
  }

  const workspace = await workspacePromise;
  scheduleWorkspaceFollowUp(workspace);

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
          category={workspace.registration.category}
          medicalStatus={workspace.evidence.medicalStatus}
          registrationId={workspace.registration.id}
          editionWindow={{
            isActive: workspace.registration.isActive,
            registrationOpensAt: workspace.registration.registrationOpensAt,
            registrationClosesAt: workspace.registration.registrationClosesAt,
          }}
          identityConflict={workspace.identityConflict}
          shirtSizeDue={workspace.shirtSizeOnlyGap}
        />
      </>
    );
  }

  if (shell.actor?.mediaPartner && !shell.showMedia) {
    return (
      <EmptyState icon="camera" title={it.mediaSuspendedTitle}>
        <p>{it.mediaSuspendedLead}</p>
      </EmptyState>
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
