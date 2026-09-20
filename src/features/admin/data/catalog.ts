import { randomBytes } from "node:crypto";
import type { PaymentMode, RegistrationStatus, RequirementAudience, RequirementCode } from "@generated/client";
import { prisma } from "@/shared/lib/prisma";

export function toSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || `edizione-${randomBytes(3).toString("hex")}`;
}

export function createTeamInviteCode() {
  return `T-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function uniqueCompetitionSlug(name: string) {
  const base = toSlug(name);
  let slug = base;
  let n = 2;
  while (await prisma.competition.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export async function adminHubStats() {
  const [pendingDocuments, registrations, byStatus] = await Promise.all([
    prisma.document.count({ where: { status: "PENDING_REVIEW", type: { code: "MEDICAL_CERTIFICATE" } } }),
    prisma.registration.count(),
    prisma.registration.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    pendingDocuments,
    registrations,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<
      string,
      number
    >,
  };
}

export async function listCompetitionsWithEditions() {
  return prisma.competition.findMany({
    orderBy: { name: "asc" },
    include: {
      editions: { orderBy: [{ year: "desc" }, { name: "asc" }] },
    },
  });
}

export async function getEditionAdmin(id: string) {
  return prisma.edition.findUnique({
    where: { id },
    include: {
      competition: true,
      requirements: true,
      _count: { select: { registrations: true, teams: true } },
    },
  });
}

export async function listSchools() {
  return prisma.school.findMany({ orderBy: { name: "asc" } });
}

export async function listTeamsAdmin() {
  return prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      school: true,
      edition: { include: { competition: true } },
      representative: { select: { email: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });
}

export async function getTeamAdmin(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      school: true,
      edition: { include: { competition: true } },
      representative: { select: { id: true, email: true, name: true } },
      staffInvites: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function listRegistrationsAdmin(filters: {
  editionId?: string;
  teamId?: string;
  status?: RegistrationStatus;
  q?: string;
}) {
  return prisma.registration.findMany({
    where: {
      editionId: filters.editionId || undefined,
      teamId: filters.teamId || undefined,
      status: filters.status || undefined,
      playerProfile: filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      playerProfile: {
        select: { id: true, firstName: true, lastName: true, userId: true },
      },
      team: { select: { id: true, name: true } },
      edition: { select: { id: true, name: true, competition: { select: { name: true } } } },
    },
  });
}

export async function getPlayerAdmin(profileId: string) {
  return prisma.playerProfile.findUnique({
    where: { id: profileId },
    include: {
      user: { select: { id: true, email: true, emailVerified: true } },
      guardians: { orderBy: { createdAt: "asc" }, take: 1 },
      registrations: {
        include: {
          team: { include: { edition: { include: { competition: true } } } },
          documents: {
            where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
            select: { id: true, status: true, originalFilename: true },
            take: 1,
            orderBy: { uploadedAt: "desc" },
          },
          consentRecords: {
            include: { legalDocumentVersion: { include: { legalDocument: true } } },
            orderBy: { acceptedAt: "desc" },
            take: 20,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function listPaymentsAdmin() {
  return prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      provider: true,
      createdAt: true,
      paidAt: true,
      team: { select: { name: true } },
      edition: { select: { name: true, competition: { select: { name: true } } } },
      registration: {
        select: { playerProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

export async function listAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { email: true, name: true } },
    },
  });
}

export async function listCurrentLegalVersions() {
  return prisma.legalDocument.findMany({
    orderBy: { slug: "asc" },
    include: {
      versions: { where: { isCurrent: true }, take: 1, select: { version: true, effectiveAt: true } },
    },
  });
}

export async function createCompetitionWithEdition(input: {
  competitionName: string;
  editionName: string;
  year: number;
  paymentMode: PaymentMode;
  playerFeeAmount: number | null;
  teamFeeAmount: number | null;
  isActive: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  requirements: { code: RequirementCode; required: boolean; appliesTo: RequirementAudience }[];
}) {
  const slug = await uniqueCompetitionSlug(input.competitionName);
  return prisma.competition.create({
    data: {
      name: input.competitionName,
      slug,
      editions: {
        create: {
          name: input.editionName,
          year: input.year,
          paymentMode: input.paymentMode,
          playerFeeAmount: input.playerFeeAmount,
          teamFeeAmount: input.teamFeeAmount,
          isActive: input.isActive,
          registrationOpensAt: input.registrationOpensAt,
          registrationClosesAt: input.registrationClosesAt,
          requirements: { create: input.requirements },
        },
      },
    },
    include: { editions: true },
  });
}

export async function updateEditionAdmin(input: {
  id: string;
  name: string;
  year: number;
  paymentMode: PaymentMode;
  playerFeeAmount: number | null;
  teamFeeAmount: number | null;
  isActive: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  requirements: { code: RequirementCode; required: boolean; appliesTo: RequirementAudience }[];
}) {
  await prisma.$transaction(async (tx) => {
    await tx.edition.update({
      where: { id: input.id },
      data: {
        name: input.name,
        year: input.year,
        paymentMode: input.paymentMode,
        playerFeeAmount: input.playerFeeAmount,
        teamFeeAmount: input.teamFeeAmount,
        isActive: input.isActive,
        registrationOpensAt: input.registrationOpensAt,
        registrationClosesAt: input.registrationClosesAt,
      },
    });
    await tx.editionRequirement.deleteMany({ where: { editionId: input.id } });
    if (input.requirements.length > 0) {
      await tx.editionRequirement.createMany({
        data: input.requirements.map((requirement) => ({
          editionId: input.id,
          ...requirement,
        })),
      });
    }
  });
}

export async function createSchoolAndTeam(input: {
  schoolName: string;
  schoolCity?: string;
  teamName: string;
  editionId: string;
}) {
  const school = await prisma.school.create({
    data: { name: input.schoolName, city: input.schoolCity ?? null },
  });
  const team = await prisma.team.create({
    data: {
      name: input.teamName,
      editionId: input.editionId,
      schoolId: school.id,
      inviteCode: createTeamInviteCode(),
    },
  });
  return team;
}

export async function deleteEditionAdmin(id: string) {
  const edition = await prisma.edition.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!edition) return { ok: false as const, reason: "missing" as const };
  if (edition._count.registrations > 0) {
    return { ok: false as const, reason: "has_registrations" as const };
  }
  await prisma.edition.delete({ where: { id } });
  return { ok: true as const };
}

export async function filterOptions() {
  const [editions, teams] = await Promise.all([
    prisma.edition.findMany({
      orderBy: [{ year: "desc" }, { name: "asc" }],
      select: { id: true, name: true, year: true, competition: { select: { name: true } } },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { editions, teams };
}
