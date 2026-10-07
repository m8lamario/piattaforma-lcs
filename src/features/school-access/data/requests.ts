import { randomBytes } from "node:crypto";
import type { Prisma, SchoolRegistrationStatus } from "@generated/client";
import { hashPassword } from "@/features/auth/domain/password";
import { createTeamInviteCode } from "@/features/admin/data/catalog";
import { inspectActivation, type ActivationRecord } from "@/features/school-access/domain/activation";
import {
  classifySchoolAccessRequest,
  representativeProvisionRoles,
  type SchoolAccessFacts,
} from "@/features/school-access/domain/classify";
import { schoolNameKey, schoolsMatch } from "@/features/school-access/domain/normalize";
import type { SchoolAccessRequestValues } from "@/features/school-access/schemas/request";
import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";

type Tx = Prisma.TransactionClient;

const requestInclude = {
  edition: { include: { competition: true } },
  reviewedBy: { select: { id: true, email: true, name: true } },
  school: { select: { id: true, name: true, city: true } },
  team: { select: { id: true, name: true } },
  user: { select: { id: true, email: true, passwordHash: true, emailVerified: true } },
} as const;

function toActivationRecord(row: {
  status: ActivationRecord["status"];
  activationTokenHash: string | null;
  activationExpiresAt: Date | null;
  activatedAt: Date | null;
  user: { passwordHash: string | null } | null;
}): ActivationRecord {
  return {
    status: row.status,
    activationTokenHash: row.activationTokenHash,
    activationExpiresAt: row.activationExpiresAt,
    activatedAt: row.activatedAt,
    userPasswordHash: row.user?.passwordHash ?? null,
  };
}

export async function listActiveEditionsForAccess() {
  return prisma.edition.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      year: true,
      competition: { select: { name: true } },
    },
  });
}

export async function listSchoolAccessRequests(status?: SchoolRegistrationStatus) {
  return prisma.schoolRegistrationRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: requestInclude,
  });
}

export async function countPendingSchoolAccessRequests() {
  return prisma.schoolRegistrationRequest.count({ where: { status: "PENDING" } });
}

export async function getSchoolAccessRequest(id: string) {
  return prisma.schoolRegistrationRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
}

export async function gatherSchoolAccessFacts(
  tx: Tx,
  input: { email: string; schoolName: string; city: string; editionId: string; excludeId?: string },
): Promise<SchoolAccessFacts> {
  const email = input.email.toLowerCase();
  const nameKey = schoolNameKey(input.schoolName);
  const notSelf = input.excludeId ? { id: { not: input.excludeId } } : {};

  const [emailUser, pendingEmail, pendingSchool, approvedEmail, approvedSchool, editionTeams] = await Promise.all([
    tx.user.findUnique({ where: { email }, select: { id: true } }),
    tx.schoolRegistrationRequest.findFirst({
      where: { email, status: "PENDING", ...notSelf },
      select: { id: true },
    }),
    tx.schoolRegistrationRequest.findFirst({
      where: { schoolNameKey: nameKey, editionId: input.editionId, status: "PENDING", ...notSelf },
      select: { id: true },
    }),
    tx.schoolRegistrationRequest.findFirst({
      where: { email, status: "APPROVED", activatedAt: null, ...notSelf },
      select: { id: true },
    }),
    tx.schoolRegistrationRequest.findFirst({
      where: { schoolNameKey: nameKey, editionId: input.editionId, status: "APPROVED", activatedAt: null, ...notSelf },
      select: { id: true },
    }),
    tx.team.findMany({
      where: { editionId: input.editionId },
      select: { school: { select: { name: true, city: true } } },
    }),
  ]);

  const schoolAlreadyOnEdition = editionTeams.some((team) =>
    schoolsMatch(team.school, { name: input.schoolName, city: input.city }),
  );

  return {
    emailHasAccount: Boolean(emailUser),
    schoolAlreadyOnEdition,
    pendingSameEmail: Boolean(pendingEmail),
    pendingSameSchoolEdition: Boolean(pendingSchool),
    approvedUnactivatedSameEmail: Boolean(approvedEmail),
    approvedUnactivatedSameSchoolEdition: Boolean(approvedSchool),
  };
}

export async function createSchoolAccessRequest(input: SchoolAccessRequestValues) {
  const email = input.email.toLowerCase();
  const nameKey = schoolNameKey(input.schoolName);

  try {
    return await prisma.$transaction(async (tx) => {
      const edition = await tx.edition.findUnique({
        where: { id: input.editionId },
        select: { id: true, isActive: true },
      });
      if (!edition?.isActive) return { ok: false as const, code: "SCHOOL_ACCESS_EDITION_UNAVAILABLE" as const };

      const facts = await gatherSchoolAccessFacts(tx, {
        email,
        schoolName: input.schoolName,
        city: input.city,
        editionId: input.editionId,
      });
      const decision = classifySchoolAccessRequest(facts);
      if (!decision.ok) return { ok: false as const, code: decision.code };

      const created = await tx.schoolRegistrationRequest.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone: input.phone,
          schoolName: input.schoolName.trim().replace(/\s+/g, " "),
          schoolNameKey: nameKey,
          city: input.city.trim().replace(/\s+/g, " "),
          requesterRole: input.requesterRole,
          institutionalEmail: input.institutionalEmail.trim() ? input.institutionalEmail.trim() : null,
          editionId: input.editionId,
        },
      });
      return { ok: true as const, request: created };
    });
  } catch (error) {
    if (isUniquePendingConflict(error)) return { ok: false as const, code: "SCHOOL_ACCESS_DUPLICATE" as const };
    throw error;
  }
}

export async function approveSchoolAccessRequest(input: {
  id: string;
  reviewedByUserId: string;
  origin: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.schoolRegistrationRequest.findUnique({ where: { id: input.id } });
      if (!request) return { ok: false as const, code: "SCHOOL_ACCESS_NOT_FOUND" as const };
      if (request.status !== "PENDING") return { ok: false as const, code: "SCHOOL_ACCESS_NOT_PENDING" as const };

      const edition = await tx.edition.findUnique({
        where: { id: request.editionId },
        select: { id: true, isActive: true },
      });
      if (!edition?.isActive) return { ok: false as const, code: "SCHOOL_ACCESS_EDITION_UNAVAILABLE" as const };

      const facts = await gatherSchoolAccessFacts(tx, {
        email: request.email,
        schoolName: request.schoolName,
        city: request.city,
        editionId: request.editionId,
        excludeId: request.id,
      });
      const decision = classifySchoolAccessRequest(facts);
      if (!decision.ok) return { ok: false as const, code: decision.code };

      const school = await findOrCreateSchool(tx, request.schoolName, request.city);
      const team = await tx.team.create({
        data: {
          name: request.schoolName,
          editionId: request.editionId,
          schoolId: school.id,
          inviteCode: createTeamInviteCode(),
          registrationToken: randomBytes(32).toString("base64url"),
          contactName: `${request.firstName} ${request.lastName}`.trim(),
          contactEmail: request.email,
        },
      });

      const roles = representativeProvisionRoles();
      const user = await tx.user.create({
        data: {
          email: request.email,
          name: `${request.firstName} ${request.lastName}`.trim(),
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: roles.userRole, teamId: team.id },
      });
      await tx.teamMembership.create({
        data: { teamId: team.id, userId: user.id, role: roles.membershipRole },
      });
      await tx.team.update({
        where: { id: team.id },
        data: { representativeUserId: user.id },
      });

      const token = createInviteToken();
      const activationTokenHash = hashInviteToken(token);
      const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();

      const claimed = await tx.schoolRegistrationRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedAt: now,
          reviewedByUserId: input.reviewedByUserId,
          schoolId: school.id,
          teamId: team.id,
          userId: user.id,
          activationTokenHash,
          activationExpiresAt,
        },
      });
      if (claimed.count !== 1) return { ok: false as const, code: "SCHOOL_ACCESS_NOT_PENDING" as const };

      return {
        ok: true as const,
        token,
        activateUrl: `${input.origin}/attiva-account/${token}`,
        expiresAt: activationExpiresAt,
        request: {
          id: request.id,
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          schoolName: request.schoolName,
          userId: user.id,
        },
      };
    });
  } catch (error) {
    if (isUniqueEmailConflict(error)) return { ok: false as const, code: "SCHOOL_ACCESS_EMAIL_TAKEN" as const };
    throw error;
  }
}

export async function rejectSchoolAccessRequest(input: {
  id: string;
  reviewedByUserId: string;
  rejectionReason?: string;
}) {
  const request = await prisma.schoolRegistrationRequest.findUnique({ where: { id: input.id } });
  if (!request) return { ok: false as const, code: "SCHOOL_ACCESS_NOT_FOUND" as const };
  if (request.status !== "PENDING") return { ok: false as const, code: "SCHOOL_ACCESS_NOT_PENDING" as const };

  const claimed = await prisma.schoolRegistrationRequest.updateMany({
    where: { id: input.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.reviewedByUserId,
      rejectionReason: input.rejectionReason ?? null,
    },
  });
  if (claimed.count !== 1) return { ok: false as const, code: "SCHOOL_ACCESS_NOT_PENDING" as const };

  return {
    ok: true as const,
    request: {
      id: request.id,
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      schoolName: request.schoolName,
      rejectionReason: input.rejectionReason,
    },
  };
}

export async function issueActivationToken(input: { id: string; origin: string }) {
  const request = await prisma.schoolRegistrationRequest.findUnique({
    where: { id: input.id },
    include: { user: { select: { passwordHash: true } } },
  });
  if (!request) return { ok: false as const, code: "SCHOOL_ACCESS_NOT_FOUND" as const };
  if (request.status !== "APPROVED" || request.activatedAt || request.user?.passwordHash) {
    return { ok: false as const, code: "SCHOOL_ACCESS_RESEND_NOT_ALLOWED" as const };
  }

  const token = createInviteToken();
  const activationTokenHash = hashInviteToken(token);
  const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.schoolRegistrationRequest.update({
    where: { id: request.id },
    data: { activationTokenHash, activationExpiresAt },
  });

  return {
    ok: true as const,
    token,
    activateUrl: `${input.origin}/attiva-account/${token}`,
    expiresAt: activationExpiresAt,
    request: {
      id: request.id,
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      schoolName: request.schoolName,
    },
  };
}

export async function findSchoolAccessByActivationToken(token: string) {
  const activationTokenHash = hashInviteToken(token);
  return prisma.schoolRegistrationRequest.findUnique({
    where: { activationTokenHash },
    include: { user: { select: { id: true, email: true, passwordHash: true } } },
  });
}

export function inspectSchoolAccessActivation(
  row: {
    status: ActivationRecord["status"];
    activationTokenHash: string | null;
    activationExpiresAt: Date | null;
    activatedAt: Date | null;
    user: { passwordHash: string | null } | null;
  } | null,
  now = new Date(),
) {
  return inspectActivation(row ? toActivationRecord(row) : null, now);
}

export async function activateSchoolAccessAccount(input: { token: string; password: string }) {
  const activationTokenHash = hashInviteToken(input.token);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const request = await tx.schoolRegistrationRequest.findUnique({
      where: { activationTokenHash },
      include: { user: { select: { id: true, passwordHash: true } } },
    });
    const outcome = inspectActivation(request ? toActivationRecord(request) : null);
    if (outcome !== "ok" || !request?.userId || !request.user) {
      return { ok: false as const, outcome: outcome === "ok" ? ("invalid" as const) : outcome };
    }

    const claimed = await tx.schoolRegistrationRequest.updateMany({
      where: {
        id: request.id,
        status: "APPROVED",
        activatedAt: null,
        activationTokenHash,
        activationExpiresAt: { gt: new Date() },
      },
      data: { activatedAt: new Date() },
    });
    if (claimed.count !== 1) {
      return { ok: false as const, outcome: "used" as const };
    }

    await tx.user.update({
      where: { id: request.user.id },
      data: { passwordHash },
    });

    return { ok: true as const, userId: request.user.id, email: request.email };
  });
}

async function findOrCreateSchool(tx: Tx, name: string, city: string) {
  const schools = await tx.school.findMany({ select: { id: true, name: true, city: true } });
  const existing = schools.find((school) => schoolsMatch(school, { name, city }));
  if (existing) return existing;
  return tx.school.create({ data: { name, city } });
}

function prismaErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

function isUniquePendingConflict(error: unknown) {
  return prismaErrorCode(error) === "P2002";
}

function isUniqueEmailConflict(error: unknown) {
  if (!isUniquePendingConflict(error)) return false;
  const meta = typeof error === "object" && error !== null && "meta" in error ? Reflect.get(error, "meta") : undefined;
  const target = typeof meta === "object" && meta !== null && "target" in meta ? Reflect.get(meta, "target") : undefined;
  return Array.isArray(target) && target.includes("email");
}
