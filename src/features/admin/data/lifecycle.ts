import type { Prisma } from "@generated/client";
import { prisma } from "@/shared/lib/prisma";
import type { ErrorCode } from "@/shared/errors/codes";
import {
  decideAnonymizeAccount,
  decideDeleteAccount,
  decideRemoveFromTeam,
  LIFECYCLE_CODES,
  lifecycleMessage,
  type AccountInput,
  type AnonymizePlan,
  type DeletePlan,
  type RemovePlan,
  type UserLifecycleStatus,
} from "@/features/admin/domain/lifecycle";
import { passwordResetIdentifier } from "@/features/auth/domain/reset";

function lifecycleOf(status: string): UserLifecycleStatus {
  if (status === "DELETED" || status === "ANONYMIZED") return status;
  return "ACTIVE";
}

export async function getMembershipForTeam(membershipId: string, teamId: string) {
  return prisma.teamMembership.findFirst({
    where: { id: membershipId, teamId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          lifecycleStatus: true,
          playerProfile: {
            select: {
              lastName: true,
              registrations: { where: { teamId }, select: { id: true } },
            },
          },
        },
      },
    },
  });
}

export async function removePlayerFromTeam(input: {
  teamId: string;
  membershipId: string;
  confirm: string;
  actorUserId: string;
}): Promise<{ ok: true; plan: RemovePlan } | { ok: false; code: ErrorCode; error: string }> {
  const membership = await getMembershipForTeam(input.membershipId, input.teamId);
  const pendingInvites = membership
    ? await prisma.playerInvite.findMany({
        where: { teamId: input.teamId, email: membership.user.email, status: "PENDING" },
        select: { id: true },
      })
    : [];

  const decision = decideRemoveFromTeam({
    membership: membership
      ? {
          id: membership.id,
          teamId: membership.teamId,
          userId: membership.userId,
          role: membership.role,
        }
      : null,
    lastName: membership?.user.playerProfile?.lastName ?? "",
    confirm: input.confirm,
    registrationIds: membership?.user.playerProfile?.registrations.map((row) => row.id) ?? [],
    pendingInviteIds: pendingInvites.map((row) => row.id),
    targetLifecycleStatus: membership ? lifecycleOf(membership.user.lifecycleStatus) : "ACTIVE",
  });
  if (!decision.ok) {
    return { ok: false, code: decision.code, error: lifecycleMessage(decision.code) };
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMembership.deleteMany({
      where: { id: decision.plan.deleteMembershipId, teamId: decision.plan.teamId },
    });
    if (decision.plan.revokeInviteIds.length > 0) {
      await tx.playerInvite.updateMany({
        where: { id: { in: decision.plan.revokeInviteIds }, teamId: decision.plan.teamId, status: "PENDING" },
        data: { status: "REVOKED" },
      });
    }
    if (decision.plan.markRegistrationIds.length > 0) {
      await tx.registration.updateMany({
        where: { id: { in: decision.plan.markRegistrationIds }, teamId: decision.plan.teamId },
        data: { status: "REMOVED" },
      });
    }
    await tx.notification.create({
      data: {
        userId: decision.plan.userId,
        type: "PLAYER_REMOVED",
        title: "Sei stato rimosso dalla squadra",
        body: "Il rappresentante ti ha tolto dalla rosa. Il tuo account resta attivo. Non è un ritiro iscrizione né una chiusura account.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "PLAYER_REMOVE",
        entityType: "User",
        entityId: decision.plan.userId,
        metadata: {
          teamId: decision.plan.teamId,
          membershipId: decision.plan.deleteMembershipId,
          registrations: decision.plan.markRegistrationIds.length,
        },
      },
    });
  });

  return { ok: true, plan: decision.plan };
}

async function loadAccountInput(userId: string, actorUserId: string, confirm: string): Promise<AccountInput> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      teamMemberships: { select: { id: true } },
      sessions: { select: { id: true } },
      accounts: { select: { id: true } },
      notifications: { select: { id: true } },
      playerProfile: {
        include: {
          guardians: { select: { id: true } },
          documents: { select: { id: true } },
          registrations: { select: { id: true } },
        },
      },
      consentRecords: { select: { id: true } },
      payments: { select: { id: true } },
      representativeTeams: { select: { id: true } },
    },
  });

  const [pendingInvites, pendingStaff, auditLogCount, activeSuperAdminCount] = await Promise.all([
    user
      ? prisma.playerInvite.findMany({
          where: { email: user.email, status: "PENDING" },
          select: { id: true },
        })
      : Promise.resolve([]),
    user
      ? prisma.staffInvite.findMany({
          where: { email: user.email, status: "PENDING" },
          select: { id: true },
        })
      : Promise.resolve([]),
    prisma.auditLog.count({
      where: { OR: [{ entityId: userId, entityType: "User" }, { actorUserId: userId }] },
    }),
    prisma.userRole.count({
      where: { role: "SUPER_ADMIN", user: { lifecycleStatus: "ACTIVE" } },
    }),
  ]);

  return {
    user: user
      ? {
          id: user.id,
          lifecycleStatus: lifecycleOf(user.lifecycleStatus),
          isSuperAdmin: user.roles.some((role) => role.role === "SUPER_ADMIN"),
        }
      : null,
    actorUserId,
    confirm,
    activeSuperAdminCount,
    membershipIds: user?.teamMemberships.map((row) => row.id) ?? [],
    pendingInviteIds: pendingInvites.map((row) => row.id),
    pendingStaffInviteIds: pendingStaff.map((row) => row.id),
    representativeTeamIds: user?.representativeTeams.map((row) => row.id) ?? [],
    sessionIds: user?.sessions.map((row) => row.id) ?? [],
    accountIds: user?.accounts.map((row) => row.id) ?? [],
    notificationIds: user?.notifications.map((row) => row.id) ?? [],
    guardianIds: user?.playerProfile?.guardians.map((row) => row.id) ?? [],
    documentIds: user?.playerProfile?.documents.map((row) => row.id) ?? [],
    consentIds: user?.consentRecords.map((row) => row.id) ?? [],
    paymentIds: user?.payments.map((row) => row.id) ?? [],
    roleIds: user?.roles.map((row) => row.id) ?? [],
    registrationIds: user?.playerProfile?.registrations.map((row) => row.id) ?? [],
    auditLogCount,
  };
}

async function applyAccessRevocation(
  tx: Prisma.TransactionClient,
  plan: DeletePlan | AnonymizePlan,
  oldEmail: string,
) {
  if (plan.deleteMembershipIds.length > 0) {
    await tx.teamMembership.deleteMany({ where: { id: { in: plan.deleteMembershipIds } } });
  }
  if (plan.revokeInviteIds.length > 0) {
    await tx.playerInvite.updateMany({
      where: { id: { in: plan.revokeInviteIds }, status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }
  if (plan.revokeStaffInviteIds.length > 0) {
    await tx.staffInvite.updateMany({
      where: { id: { in: plan.revokeStaffInviteIds }, status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }
  if (plan.clearRepresentativeTeamIds.length > 0) {
    await tx.team.updateMany({
      where: { id: { in: plan.clearRepresentativeTeamIds } },
      data: { representativeUserId: null },
    });
  }
  if (plan.deleteSessionIds.length > 0) {
    await tx.session.deleteMany({ where: { id: { in: plan.deleteSessionIds } } });
  }
  if (plan.deleteAccountIds.length > 0) {
    await tx.account.deleteMany({ where: { id: { in: plan.deleteAccountIds } } });
  }
  if (plan.deleteNotificationIds.length > 0) {
    await tx.notification.deleteMany({ where: { id: { in: plan.deleteNotificationIds } } });
  }
  if (plan.revokeRoleIds.length > 0) {
    await tx.userRole.deleteMany({ where: { id: { in: plan.revokeRoleIds } } });
  }
  await tx.verificationToken.deleteMany({
    where: {
      OR: [{ identifier: oldEmail }, { identifier: passwordResetIdentifier(oldEmail) }],
    },
  });
}

async function markRegistrationsRemoved(tx: Prisma.TransactionClient, registrationIds: string[]) {
  if (registrationIds.length === 0) return;
  await tx.registration.updateMany({
    where: { id: { in: registrationIds }, status: { notIn: ["WITHDRAWN", "REMOVED"] } },
    data: { status: "REMOVED" },
  });
}

export async function deleteUserAccount(input: {
  userId: string;
  confirm: string;
  actorUserId: string;
}): Promise<{ ok: true; plan: DeletePlan } | { ok: false; code: ErrorCode; error: string }> {
  const snapshot = await loadAccountInput(input.userId, input.actorUserId, input.confirm);
  const decision = decideDeleteAccount(snapshot);
  if (!decision.ok) {
    return { ok: false, code: decision.code, error: lifecycleMessage(decision.code) };
  }
  const current = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!current) {
    return {
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND,
      error: lifecycleMessage(LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND),
    };
  }

  await prisma.$transaction(async (tx) => {
    await applyAccessRevocation(tx, decision.plan, current.email);
    await markRegistrationsRemoved(tx, decision.plan.markRegistrationIds);
    await tx.user.update({
      where: { id: decision.plan.userId },
      data: {
        email: decision.plan.tombstoneEmail,
        name: null,
        image: null,
        passwordHash: null,
        emailVerified: null,
        lifecycleStatus: "DELETED",
        deletedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "ACCOUNT_DELETE",
        entityType: "User",
        entityId: decision.plan.userId,
        metadata: {
          memberships: decision.plan.deleteMembershipIds.length,
          rolesCleared: decision.plan.revokeRoleIds.length,
          documentsRetained: snapshot.documentIds.length,
          paymentsRetained: snapshot.paymentIds.length,
          auditPriorCount: decision.plan.auditLogCount,
        },
      },
    });
  });

  return { ok: true, plan: decision.plan };
}

export async function anonymizeUserAccount(input: {
  userId: string;
  confirm: string;
  actorUserId: string;
}): Promise<{ ok: true; plan: AnonymizePlan } | { ok: false; code: ErrorCode; error: string }> {
  const snapshot = await loadAccountInput(input.userId, input.actorUserId, input.confirm);
  const decision = decideAnonymizeAccount(snapshot);
  if (!decision.ok) {
    return { ok: false, code: decision.code, error: lifecycleMessage(decision.code) };
  }
  const current = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, playerProfile: { select: { id: true } } },
  });
  if (!current) {
    return {
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND,
      error: lifecycleMessage(LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND),
    };
  }

  await prisma.$transaction(async (tx) => {
    await applyAccessRevocation(tx, decision.plan, current.email);
    await markRegistrationsRemoved(tx, decision.plan.markRegistrationIds);
    await tx.user.update({
      where: { id: decision.plan.userId },
      data: {
        email: decision.plan.tombstoneEmail,
        name: null,
        image: null,
        passwordHash: null,
        emailVerified: null,
        lifecycleStatus: "ANONYMIZED",
        anonymizedAt: new Date(),
        deletedAt: new Date(),
      },
    });
    if (current.playerProfile) {
      await tx.playerProfile.update({
        where: { id: current.playerProfile.id },
        data: {
          firstName: "Anonimo",
          lastName: "Utente",
          birthDate: null,
          fiscalCode: null,
          phone: null,
          metadata: { anonymized: true },
        },
      });
    }
    for (const guardianId of decision.plan.anonymizeGuardianIds) {
      await tx.guardian.update({
        where: { id: guardianId },
        data: {
          firstName: "Anonimo",
          lastName: "Contatto",
          relationship: "ALTRO",
          email: `anon.guardian.${guardianId}@invalid.local`,
          phone: null,
          metadata: { anonymized: true },
        },
      });
    }
    if (decision.plan.redactDocumentIds.length > 0) {
      await tx.document.updateMany({
        where: { id: { in: decision.plan.redactDocumentIds } },
        data: { originalFilename: "redatto" },
      });
    }
    if (decision.plan.redactConsentIds.length > 0) {
      await tx.consentRecord.updateMany({
        where: { id: { in: decision.plan.redactConsentIds } },
        data: { ipAddress: null, userAgent: null },
      });
    }
    await tx.playerInvite.updateMany({
      where: { acceptedByUserId: decision.plan.userId },
      data: { email: decision.plan.tombstoneEmail, firstName: null, lastName: null },
    });
    await tx.staffInvite.updateMany({
      where: { acceptedByUserId: decision.plan.userId },
      data: { email: decision.plan.tombstoneEmail },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "ACCOUNT_ANONYMIZE",
        entityType: "User",
        entityId: decision.plan.userId,
        metadata: {
          documentsRedacted: decision.plan.redactDocumentIds.length,
          consentsRedacted: decision.plan.redactConsentIds.length,
          paymentsRetained: decision.plan.retainPaymentIds.length,
          auditPriorCount: decision.plan.auditLogCount,
        },
      },
    });
  });

  return { ok: true, plan: decision.plan };
}

export async function listUsersAdmin(q?: string) {
  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      lifecycleStatus: true,
      deletedAt: true,
      anonymizedAt: true,
      createdAt: true,
      roles: { select: { role: true, teamId: true } },
      playerProfile: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function getUserAdmin(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      lifecycleStatus: true,
      deletedAt: true,
      anonymizedAt: true,
      createdAt: true,
      emailVerified: true,
      roles: { select: { id: true, role: true, teamId: true } },
      teamMemberships: {
        select: { id: true, role: true, team: { select: { id: true, name: true } } },
      },
      playerProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          registrations: {
            select: { id: true, status: true, team: { select: { name: true } } },
            take: 20,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      _count: {
        select: { notifications: true, consentRecords: true, payments: true, auditLogs: true },
      },
    },
  });
}
