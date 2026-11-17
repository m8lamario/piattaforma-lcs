import type { LeagueSupervisorStatus, Prisma } from "@generated/client";
import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { hashPassword } from "@/features/auth/domain/password";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";
import { inspectLeagueActivation } from "@/features/league/domain/activation";

type Tx = Prisma.TransactionClient;

const accountInclude = {
  user: { select: { id: true, email: true, name: true, passwordHash: true, lifecycleStatus: true } },
  edition: { select: { id: true, name: true, year: true, competition: { select: { name: true } } } },
} as const;

function prismaErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

function isUniqueEmailConflict(error: unknown) {
  return prismaErrorCode(error) === "P2002";
}

export async function listLeagueSupervisorEditions() {
  return prisma.edition.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true, competition: { select: { name: true } } },
  });
}

export async function listLeagueSupervisors() {
  return prisma.leagueSupervisor.findMany({
    include: accountInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listLeagueSupervisorsForEdition(editionId: string) {
  return prisma.leagueSupervisor.findMany({
    where: { editionId },
    include: accountInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function createLeagueSupervisor(input: {
  editionId: string;
  email: string;
  firstName: string;
  lastName: string;
  origin: string;
  createdByUserId: string;
}) {
  const email = input.email.toLowerCase();
  const name = `${input.firstName} ${input.lastName}`.trim();
  try {
    return await prisma.$transaction(async (tx: Tx) => {
      const edition = await tx.edition.findUnique({
        where: { id: input.editionId },
        select: { id: true, name: true, competition: { select: { name: true } } },
      });
      if (!edition) return { ok: false as const, code: "LEAGUE_EDITION_NOT_FOUND" as const };

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true, leagueSupervisor: { select: { id: true } } },
      });
      if (existingUser) {
        return { ok: false as const, code: "LEAGUE_EMAIL_TAKEN" as const };
      }

      const user = await tx.user.create({ data: { email, name } });
      await tx.userRole.create({ data: { userId: user.id, role: "LEAGUE_SUPERVISOR" } });
      const token = createInviteToken();
      const activationTokenHash = hashInviteToken(token);
      const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
      const account = await tx.leagueSupervisor.create({
        data: {
          userId: user.id,
          editionId: edition.id,
          activationTokenHash,
          activationExpiresAt,
          createdByUserId: input.createdByUserId,
        },
      });
      return {
        ok: true as const,
        account,
        userId: user.id,
        email,
        firstName: input.firstName,
        editionTitle: `${edition.competition.name} · ${edition.name}`,
        token,
        activateUrl: `${input.origin}/attiva-supervisore/${token}`,
        expiresAt: activationExpiresAt,
      };
    });
  } catch (error) {
    if (isUniqueEmailConflict(error)) return { ok: false as const, code: "LEAGUE_EMAIL_TAKEN" as const };
    throw error;
  }
}

export async function setLeagueSupervisorStatus(input: { id: string; status: LeagueSupervisorStatus }) {
  const account = await prisma.leagueSupervisor.findUnique({
    where: { id: input.id },
    select: { id: true, userId: true, editionId: true },
  });
  if (!account) return { ok: false as const, code: "LEAGUE_NOT_FOUND" as const };

  await prisma.$transaction(async (tx) => {
    await tx.leagueSupervisor.update({
      where: { id: account.id },
      data: {
        status: input.status,
        ...(input.status === "SUSPENDED"
          ? { activationTokenHash: null, activationExpiresAt: null }
          : {}),
      },
    });
    if (input.status === "SUSPENDED") {
      await tx.session.deleteMany({ where: { userId: account.userId } });
    }
  });
  return { ok: true as const, id: account.id, editionId: account.editionId, userId: account.userId, status: input.status };
}

export async function changeLeagueSupervisorEdition(input: { id: string; editionId: string }) {
  const account = await prisma.leagueSupervisor.findUnique({
    where: { id: input.id },
    select: { id: true, editionId: true },
  });
  if (!account) return { ok: false as const, code: "LEAGUE_NOT_FOUND" as const };
  const edition = await prisma.edition.findUnique({ where: { id: input.editionId }, select: { id: true } });
  if (!edition) return { ok: false as const, code: "LEAGUE_EDITION_NOT_FOUND" as const };
  await prisma.leagueSupervisor.update({
    where: { id: account.id },
    data: { editionId: edition.id },
  });
  return { ok: true as const, id: account.id, previousEditionId: account.editionId, editionId: edition.id };
}

export async function issueLeagueSupervisorActivation(input: { id: string; origin: string }) {
  const account = await prisma.leagueSupervisor.findUnique({
    where: { id: input.id },
    include: {
      user: { select: { email: true, name: true, passwordHash: true } },
      edition: { select: { name: true, competition: { select: { name: true } } } },
    },
  });
  if (!account) return { ok: false as const, code: "LEAGUE_NOT_FOUND" as const };
  if (account.status !== "ACTIVE" || account.activatedAt || account.user.passwordHash) {
    return { ok: false as const, code: "LEAGUE_RESEND_NOT_ALLOWED" as const };
  }
  const token = createInviteToken();
  const activationTokenHash = hashInviteToken(token);
  const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.leagueSupervisor.update({
    where: { id: account.id },
    data: { activationTokenHash, activationExpiresAt },
  });
  return {
    ok: true as const,
    accountId: account.id,
    editionId: account.editionId,
    email: account.user.email,
    firstName: account.user.name?.split(" ")[0] ?? "",
    editionTitle: `${account.edition.competition.name} · ${account.edition.name}`,
    activateUrl: `${input.origin}/attiva-supervisore/${token}`,
    expiresAt: activationExpiresAt,
    userId: account.userId,
  };
}

export async function findLeagueSupervisorByActivationToken(token: string) {
  const activationTokenHash = hashInviteToken(token);
  return prisma.leagueSupervisor.findUnique({
    where: { activationTokenHash },
    include: {
      user: { select: { id: true, email: true, passwordHash: true } },
      edition: { select: { name: true, competition: { select: { name: true } } } },
    },
  });
}

export function inspectLeagueSupervisorActivation(
  row: {
    status: LeagueSupervisorStatus;
    activationTokenHash: string | null;
    activationExpiresAt: Date | null;
    activatedAt: Date | null;
    user: { passwordHash: string | null } | null;
  } | null,
  now = new Date(),
) {
  if (!row) return inspectLeagueActivation(null, now);
  return inspectLeagueActivation(
    {
      status: row.status,
      activationTokenHash: row.activationTokenHash,
      activationExpiresAt: row.activationExpiresAt,
      activatedAt: row.activatedAt,
      userPasswordHash: row.user?.passwordHash ?? null,
    },
    now,
  );
}

export async function activateLeagueSupervisorAccount(input: { token: string; password: string }) {
  const activationTokenHash = hashInviteToken(input.token);
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const account = await tx.leagueSupervisor.findUnique({
      where: { activationTokenHash },
      include: { user: { select: { id: true, email: true, passwordHash: true } } },
    });
    const outcome = inspectLeagueSupervisorActivation(account);
    if (outcome !== "ok" || !account?.user) {
      return { ok: false as const, outcome: outcome === "ok" ? ("invalid" as const) : outcome };
    }
    const claimed = await tx.leagueSupervisor.updateMany({
      where: {
        id: account.id,
        status: "ACTIVE",
        activatedAt: null,
        activationTokenHash,
        activationExpiresAt: { gt: new Date() },
      },
      data: { activatedAt: new Date(), activationTokenHash: null, activationExpiresAt: null },
    });
    if (claimed.count !== 1) {
      return { ok: false as const, outcome: "used" as const };
    }
    await tx.user.update({
      where: { id: account.user.id },
      data: { passwordHash },
    });
    return { ok: true as const, userId: account.user.id, email: account.user.email, accountId: account.id };
  });
}
