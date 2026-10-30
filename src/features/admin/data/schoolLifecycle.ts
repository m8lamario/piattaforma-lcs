import { randomBytes } from "node:crypto";
import {
  applyAnonymizePlanInTx,
  applyDeletePlanInTx,
  loadAccountInput,
} from "@/features/admin/data/lifecycle";
import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD, decideAnonymizeAccount, decideDeleteAccount } from "@/features/admin/domain/lifecycle";
import {
  decideAnonymizeSchool,
  decideDeleteSchool,
  schoolIsAnonymized,
  type SchoolLifecycleSnapshot,
  type SchoolUserRef,
} from "@/features/admin/domain/schoolLifecycle";
import { purgeDocumentBlob } from "@/features/documents/data/retention";
import { userMessage, type ErrorCode } from "@/shared/errors";
import { prisma } from "@/shared/lib/prisma";

const PLATFORM_ROLES = new Set([
  "ORGANIZATION_ADMIN",
  "MEDICAL_REVIEWER",
  "SUPER_ADMIN",
  "COMPETITION_ORGANIZER",
  "MEDIA_PARTNER",
]);

function token(prefix: string) {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

export async function loadSchoolLifecycleSnapshot(schoolId: string, actorUserId: string, confirm = ""): Promise<SchoolLifecycleSnapshot> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      teams: {
        select: {
          id: true,
          representativeUserId: true,
          memberships: { select: { userId: true, role: true } },
          registrations: {
            select: {
              id: true,
              category: true,
              playerProfile: { select: { userId: true } },
              documents: { select: { id: true, type: { select: { code: true } } } },
            },
          },
          payments: { select: { id: true } },
          bankTransfers: { select: { id: true } },
        },
      },
      registrationRequests: { select: { id: true, userId: true } },
    },
  });
  if (!school) {
    return {
      school: null,
      confirm,
      actorUserId,
      users: [],
      teamIds: [],
      registrationIds: [],
      requestIds: [],
      playerCount: 0,
      staffCount: 0,
      representativeCount: 0,
      documentIds: [],
      paymentCount: 0,
      bankTransferCount: 0,
    };
  }

  const userIds = new Set<string>();
  let playerCount = 0;
  let staffCount = 0;
  let representativeCount = 0;
  const registrationIds: string[] = [];
  const documentIds: string[] = [];
  let paymentCount = 0;
  let bankTransferCount = 0;
  for (const team of school.teams) {
    if (team.representativeUserId) {
      userIds.add(team.representativeUserId);
      representativeCount += 1;
    }
    for (const membership of team.memberships) {
      userIds.add(membership.userId);
      if (membership.role === "PLAYER") playerCount += 1;
      if (membership.role === "STAFF") staffCount += 1;
      if (membership.role === "REPRESENTATIVE") representativeCount += 1;
    }
    for (const registration of team.registrations) {
      registrationIds.push(registration.id);
      userIds.add(registration.playerProfile.userId);
      for (const document of registration.documents) {
        if (document.type.code === "MEDICAL_CERTIFICATE") documentIds.push(document.id);
      }
    }
    paymentCount += team.payments.length;
    bankTransferCount += team.bankTransfers.length;
  }
  for (const request of school.registrationRequests) {
    if (request.userId) userIds.add(request.userId);
  }

  const [users, superAdminCount] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: {
            id: true,
            lifecycleStatus: true,
            roles: { select: { role: true } },
            teamMemberships: { select: { team: { select: { schoolId: true } } } },
            representativeTeams: { select: { schoolId: true } },
            playerProfile: { select: { registrations: { select: { team: { select: { schoolId: true } } } } } },
          },
        })
      : Promise.resolve([]),
    prisma.userRole.count({ where: { role: "SUPER_ADMIN", user: { lifecycleStatus: "ACTIVE" } } }),
  ]);

  const refs: SchoolUserRef[] = users.map((row) => {
    const otherSchool =
      row.teamMemberships.some((membership) => membership.team.schoolId !== school.id) ||
      row.representativeTeams.some((team) => team.schoolId !== school.id) ||
      (row.playerProfile?.registrations.some((registration) => registration.team.schoolId !== school.id) ?? false);
    const isSuper = row.roles.some((role) => role.role === "SUPER_ADMIN");
    return {
      id: row.id,
      lifecycleStatus: row.lifecycleStatus === "DELETED" || row.lifecycleStatus === "ANONYMIZED" ? row.lifecycleStatus : "ACTIVE",
      isActor: row.id === actorUserId,
      isLastSuperAdmin: isSuper && superAdminCount <= 1,
      platformRole: row.roles.some((role) => PLATFORM_ROLES.has(role.role)),
      otherSchool,
    };
  });

  return {
    school: { id: school.id, name: school.name, anonymized: schoolIsAnonymized(school.metadata) },
    confirm,
    actorUserId,
    users: refs,
    teamIds: school.teams.map((team) => team.id),
    registrationIds,
    requestIds: school.registrationRequests.map((request) => request.id),
    playerCount,
    staffCount,
    representativeCount,
    documentIds,
    paymentCount,
    bankTransferCount,
  };
}

async function preparedAnonymize(userIds: string[], actorUserId: string) {
  const prepared: Array<{ plan: ReturnType<typeof decideAnonymizeAccount> & { ok: true }; email: string; profileId: string | null }> = [];
  for (const userId of userIds) {
    const snapshot = await loadAccountInput(userId, actorUserId, ANONYMIZE_CONFIRM_WORD);
    const decision = decideAnonymizeAccount(snapshot);
    if (!decision.ok) return { ok: false as const, code: decision.code };
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, playerProfile: { select: { id: true } } },
    });
    if (!current) return { ok: false as const, code: "LIFECYCLE_USER_NOT_FOUND" as const };
    prepared.push({ plan: decision, email: current.email, profileId: current.playerProfile?.id ?? null });
  }
  return { ok: true as const, prepared };
}

async function preparedDelete(userIds: string[], actorUserId: string) {
  const prepared: Array<{
    plan: ReturnType<typeof decideDeleteAccount> & { ok: true };
    email: string;
    documentsRetained: number;
    paymentsRetained: number;
  }> = [];
  for (const userId of userIds) {
    const snapshot = await loadAccountInput(userId, actorUserId, DELETE_CONFIRM_WORD);
    const decision = decideDeleteAccount(snapshot);
    if (!decision.ok) return { ok: false as const, code: decision.code };
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!current) return { ok: false as const, code: "LIFECYCLE_USER_NOT_FOUND" as const };
    prepared.push({
      plan: decision,
      email: current.email,
      documentsRetained: snapshot.documentIds.length,
      paymentsRetained: snapshot.paymentIds.length,
    });
  }
  return { ok: true as const, prepared };
}

export async function anonymizeSchoolAccount(input: { schoolId: string; confirm: string; actorUserId: string }) {
  const snapshot = await loadSchoolLifecycleSnapshot(input.schoolId, input.actorUserId, input.confirm);
  const decision = decideAnonymizeSchool(snapshot);
  if (!decision.ok) return { ok: false as const, code: decision.code, error: userMessage(decision.code) };
  const accounts = await preparedAnonymize(decision.plan.exclusiveUserIds, input.actorUserId);
  if (!accounts.ok) {
    return { ok: false as const, code: accounts.code, error: userMessage(accounts.code) };
  }

  await prisma.$transaction(async (tx) => {
    for (const account of accounts.prepared) {
      await applyAnonymizePlanInTx(tx, account.plan.plan, account.email, account.profileId, input.actorUserId);
    }
    if (decision.plan.detachUserIds.length > 0 && decision.plan.teamIds.length > 0) {
      await tx.teamMembership.deleteMany({
        where: { teamId: { in: decision.plan.teamIds }, userId: { in: decision.plan.detachUserIds } },
      });
    }
    if (decision.plan.registrationIds.length > 0) {
      await tx.registration.updateMany({
        where: { id: { in: decision.plan.registrationIds }, status: { notIn: ["WITHDRAWN", "REMOVED"] } },
        data: { status: "REMOVED" },
      });
      await tx.consentRecord.updateMany({
        where: { registrationId: { in: decision.plan.registrationIds } },
        data: { ipAddress: null, userAgent: null },
      });
    }
    if (decision.plan.teamIds.length > 0) {
      await tx.team.updateMany({
        where: { id: { in: decision.plan.teamIds } },
        data: { coachRegistrationId: null, contactName: null, contactEmail: null },
      });
      for (const teamId of decision.plan.teamIds) {
        await tx.team.update({
          where: { id: teamId },
          data: {
            name: `Squadra ${teamId.slice(-6)}`,
            inviteCode: token("T"),
            registrationToken: token("R"),
          },
        });
      }
      await tx.playerInvite.updateMany({
        where: { teamId: { in: decision.plan.teamIds } },
        data: { status: "REVOKED", firstName: null, lastName: null, email: "anon.invite@invalid.local" },
      });
      await tx.staffInvite.updateMany({
        where: { teamId: { in: decision.plan.teamIds } },
        data: { status: "REVOKED", email: "anon.staff@invalid.local" },
      });
    }
    if (decision.plan.requestIds.length > 0) {
      const requests = await tx.schoolRegistrationRequest.findMany({
        where: { id: { in: decision.plan.requestIds } },
        select: { id: true },
      });
      for (const request of requests) {
        await tx.schoolRegistrationRequest.update({
          where: { id: request.id },
          data: {
            firstName: "Anonimo",
            lastName: "Referente",
            email: `anon.request.${request.id}@invalid.local`,
            phone: "0000000000",
            schoolName: "Scuola anonimizzata",
            institutionalEmail: null,
            activationTokenHash: null,
          },
        });
      }
    }
    await tx.school.update({
      where: { id: decision.plan.schoolId },
      data: {
        name: "Scuola anonimizzata",
        city: null,
        metadata: { anonymized: true },
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "SCHOOL_ANONYMIZE",
        entityType: "School",
        entityId: decision.plan.schoolId,
        metadata: {
          exclusiveAccounts: decision.plan.exclusiveUserIds.length,
          detachedAccounts: decision.plan.detachUserIds.length,
          registrations: decision.plan.registrationIds.length,
          documents: decision.plan.documentIds.length,
        },
      },
    });
  });

  let purgeFailed = 0;
  for (const documentId of decision.plan.documentIds) {
    try {
      await purgeDocumentBlob(documentId);
    } catch {
      purgeFailed += 1;
    }
  }
  if (purgeFailed > 0) {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "SCHOOL_ANONYMIZE",
        entityType: "School",
        entityId: decision.plan.schoolId,
        metadata: { medicalPurgeFailed: purgeFailed },
      },
    });
  }
  return { ok: true as const, plan: decision.plan };
}

export async function deleteSchoolAccount(input: { schoolId: string; confirm: string; actorUserId: string }) {
  const snapshot = await loadSchoolLifecycleSnapshot(input.schoolId, input.actorUserId, input.confirm);
  const decision = decideDeleteSchool(snapshot);
  if (!decision.ok) return { ok: false as const, code: decision.code, error: userMessage(decision.code) };
  const accounts = await preparedDelete(decision.plan.exclusiveUserIds, input.actorUserId);
  if (!accounts.ok) {
    return { ok: false as const, code: accounts.code, error: userMessage(accounts.code) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const blockers = await tx.payment.count({
        where: {
          OR: [
            { team: { schoolId: decision.plan.schoolId } },
            { registration: { team: { schoolId: decision.plan.schoolId } } },
          ],
        },
      });
      const transfers = await tx.teamBankTransfer.count({ where: { team: { schoolId: decision.plan.schoolId } } });
      const documents = await tx.document.count({
        where: { registration: { team: { schoolId: decision.plan.schoolId } }, type: { code: "MEDICAL_CERTIFICATE" } },
      });
      if (blockers > 0 || transfers > 0 || documents > 0) {
        throw new Error("SCHOOL_DELETE_BLOCKED");
      }
      if (decision.plan.teamIds.length > 0) {
        await tx.team.updateMany({
          where: { id: { in: decision.plan.teamIds } },
          data: { coachRegistrationId: null, representativeUserId: null },
        });
      }
      if (decision.plan.registrationIds.length > 0) {
        await tx.registration.deleteMany({ where: { id: { in: decision.plan.registrationIds } } });
      }
      if (decision.plan.teamIds.length > 0) {
        await tx.team.deleteMany({ where: { id: { in: decision.plan.teamIds } } });
      }
      if (decision.plan.requestIds.length > 0) {
        await tx.schoolRegistrationRequest.updateMany({
          where: { id: { in: decision.plan.requestIds } },
          data: {
            schoolId: null,
            teamId: null,
            firstName: "Anonimo",
            lastName: "Referente",
            phone: "0000000000",
            schoolName: "Scuola rimossa",
            institutionalEmail: null,
            activationTokenHash: null,
          },
        });
        for (const requestId of decision.plan.requestIds) {
          await tx.schoolRegistrationRequest.update({
            where: { id: requestId },
            data: { email: `anon.request.${requestId}@invalid.local` },
          });
        }
      }
      await tx.school.delete({ where: { id: decision.plan.schoolId } });
      for (const account of accounts.prepared) {
        await applyDeletePlanInTx(tx, account.plan.plan, account.email, {
          actorUserId: input.actorUserId,
          documentsRetained: account.documentsRetained,
          paymentsRetained: account.paymentsRetained,
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: "SCHOOL_DELETE",
          entityType: "School",
          entityId: decision.plan.schoolId,
          metadata: {
            exclusiveAccounts: decision.plan.exclusiveUserIds.length,
            teams: decision.plan.teamIds.length,
            registrations: decision.plan.registrationIds.length,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SCHOOL_DELETE_BLOCKED") {
      return { ok: false as const, code: "SCHOOL_DELETE_BLOCKED" as const, error: userMessage("SCHOOL_DELETE_BLOCKED") };
    }
    throw error;
  }
  return { ok: true as const, plan: decision.plan };
}

export type SchoolLifecycleFailure = { ok: false; code: ErrorCode; error: string };
