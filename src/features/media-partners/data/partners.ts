import type { MediaPartnerStatus, Prisma } from "@generated/client";
import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { hashPassword } from "@/features/auth/domain/password";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";
import {
  inspectMediaActivation,
  type MediaActivationRecord,
} from "@/features/media-partners/domain/activation";

type Tx = Prisma.TransactionClient;

const accountInclude = {
  user: { select: { id: true, email: true, name: true, passwordHash: true, lifecycleStatus: true } },
} as const;

const partnerInclude = {
  competitions: { include: { competition: { select: { id: true, name: true, slug: true } } } },
  accounts: { include: accountInclude, orderBy: { createdAt: "desc" as const } },
} as const;

function prismaErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

function isUniqueEmailConflict(error: unknown) {
  return prismaErrorCode(error) === "P2002";
}

function toActivationRecord(row: {
  status: MediaPartnerStatus;
  activationTokenHash: string | null;
  activationExpiresAt: Date | null;
  activatedAt: Date | null;
  user: { passwordHash: string | null } | null;
}): MediaActivationRecord {
  return {
    status: row.status,
    activationTokenHash: row.activationTokenHash,
    activationExpiresAt: row.activationExpiresAt,
    activatedAt: row.activatedAt,
    userPasswordHash: row.user?.passwordHash ?? null,
  };
}

export async function listCompetitionsForMedia() {
  return prisma.competition.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function listMediaPartners() {
  return prisma.mediaPartner.findMany({
    orderBy: { name: "asc" },
    include: {
      competitions: { include: { competition: { select: { id: true, name: true } } } },
      _count: { select: { accounts: true } },
    },
  });
}

export async function getMediaPartner(id: string) {
  return prisma.mediaPartner.findUnique({
    where: { id },
    include: partnerInclude,
  });
}

async function assertCompetitionsExist(tx: Tx, competitionIds: string[]) {
  const found = await tx.competition.findMany({
    where: { id: { in: competitionIds } },
    select: { id: true },
  });
  return found.length === competitionIds.length;
}

export async function createMediaPartner(input: { name: string; competitionIds: string[] }) {
  const ids = [...new Set(input.competitionIds)];
  return prisma.$transaction(async (tx) => {
    if (!(await assertCompetitionsExist(tx, ids))) {
      return { ok: false as const, code: "MEDIA_PARTNER_COMPETITION_REQUIRED" as const };
    }
    const partner = await tx.mediaPartner.create({
      data: {
        name: input.name,
        competitions: { create: ids.map((competitionId) => ({ competitionId })) },
      },
    });
    return { ok: true as const, partner };
  });
}

export async function updateMediaPartner(input: { id: string; name: string; competitionIds: string[] }) {
  const ids = [...new Set(input.competitionIds)];
  return prisma.$transaction(async (tx) => {
    const existing = await tx.mediaPartner.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) return { ok: false as const, code: "MEDIA_PARTNER_NOT_FOUND" as const };
    if (!(await assertCompetitionsExist(tx, ids))) {
      return { ok: false as const, code: "MEDIA_PARTNER_COMPETITION_REQUIRED" as const };
    }
    await tx.mediaPartner.update({
      where: { id: input.id },
      data: { name: input.name },
    });
    await tx.mediaPartnerCompetition.deleteMany({
      where: { mediaPartnerId: input.id, competitionId: { notIn: ids } },
    });
    for (const competitionId of ids) {
      await tx.mediaPartnerCompetition.upsert({
        where: {
          mediaPartnerId_competitionId: { mediaPartnerId: input.id, competitionId },
        },
        update: {},
        create: { mediaPartnerId: input.id, competitionId },
      });
    }
    return { ok: true as const, id: input.id };
  });
}

export async function setMediaPartnerStatus(input: { id: string; status: MediaPartnerStatus }) {
  const existing = await prisma.mediaPartner.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!existing) return { ok: false as const, code: "MEDIA_PARTNER_NOT_FOUND" as const };
  await prisma.mediaPartner.update({
    where: { id: input.id },
    data: { status: input.status },
  });
  return { ok: true as const, id: input.id, status: input.status };
}

export async function createMediaPartnerAccount(input: {
  mediaPartnerId: string;
  email: string;
  firstName: string;
  lastName: string;
  origin: string;
}) {
  const email = input.email.toLowerCase();
  const name = `${input.firstName} ${input.lastName}`.trim();
  try {
    return await prisma.$transaction(async (tx) => {
      const partner = await tx.mediaPartner.findUnique({ where: { id: input.mediaPartnerId } });
      if (!partner) return { ok: false as const, code: "MEDIA_PARTNER_NOT_FOUND" as const };

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true, mediaPartnerAccount: { select: { id: true } } },
      });
      if (existingUser) {
        return {
          ok: false as const,
          code: existingUser.mediaPartnerAccount
            ? ("MEDIA_PARTNER_ACCOUNT_EXISTS" as const)
            : ("MEDIA_PARTNER_EMAIL_TAKEN" as const),
        };
      }

      const user = await tx.user.create({
        data: { email, name },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: "MEDIA_PARTNER" },
      });

      const token = createInviteToken();
      const activationTokenHash = hashInviteToken(token);
      const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
      const account = await tx.mediaPartnerAccount.create({
        data: {
          userId: user.id,
          mediaPartnerId: partner.id,
          activationTokenHash,
          activationExpiresAt,
        },
      });

      return {
        ok: true as const,
        account,
        userId: user.id,
        email,
        firstName: input.firstName,
        partnerName: partner.name,
        token,
        activateUrl: `${input.origin}/attiva-media/${token}`,
        expiresAt: activationExpiresAt,
      };
    });
  } catch (error) {
    if (isUniqueEmailConflict(error)) return { ok: false as const, code: "MEDIA_PARTNER_EMAIL_TAKEN" as const };
    throw error;
  }
}

export async function setMediaPartnerAccountStatus(input: { id: string; status: MediaPartnerStatus }) {
  const account = await prisma.mediaPartnerAccount.findUnique({
    where: { id: input.id },
    select: { id: true, mediaPartnerId: true },
  });
  if (!account) return { ok: false as const, code: "MEDIA_PARTNER_NOT_FOUND" as const };
  await prisma.mediaPartnerAccount.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(input.status === "SUSPENDED"
        ? { activationTokenHash: null, activationExpiresAt: null }
        : {}),
    },
  });
  return { ok: true as const, id: account.id, mediaPartnerId: account.mediaPartnerId, status: input.status };
}

export async function issueMediaPartnerActivation(input: { id: string; origin: string }) {
  const account = await prisma.mediaPartnerAccount.findUnique({
    where: { id: input.id },
    include: {
      user: { select: { email: true, name: true, passwordHash: true } },
      organization: { select: { name: true, status: true } },
    },
  });
  if (!account) return { ok: false as const, code: "MEDIA_PARTNER_NOT_FOUND" as const };
  if (
    account.status !== "ACTIVE" ||
    account.organization.status !== "ACTIVE" ||
    account.activatedAt ||
    account.user.passwordHash
  ) {
    return { ok: false as const, code: "MEDIA_PARTNER_RESEND_NOT_ALLOWED" as const };
  }

  const token = createInviteToken();
  const activationTokenHash = hashInviteToken(token);
  const activationExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.mediaPartnerAccount.update({
    where: { id: account.id },
    data: { activationTokenHash, activationExpiresAt },
  });

  return {
    ok: true as const,
    accountId: account.id,
    mediaPartnerId: account.mediaPartnerId,
    email: account.user.email,
    firstName: account.user.name?.split(" ")[0] ?? "",
    partnerName: account.organization.name,
    activateUrl: `${input.origin}/attiva-media/${token}`,
    expiresAt: activationExpiresAt,
  };
}

export async function findMediaPartnerByActivationToken(token: string) {
  const activationTokenHash = hashInviteToken(token);
  return prisma.mediaPartnerAccount.findUnique({
    where: { activationTokenHash },
    include: {
      user: { select: { id: true, email: true, passwordHash: true } },
      organization: { select: { name: true, status: true } },
    },
  });
}

export function inspectMediaPartnerActivation(
  row: {
    status: MediaPartnerStatus;
    activationTokenHash: string | null;
    activationExpiresAt: Date | null;
    activatedAt: Date | null;
    user: { passwordHash: string | null } | null;
    organization?: { status: MediaPartnerStatus };
  } | null,
  now = new Date(),
) {
  if (!row) return inspectMediaActivation(null, now);
  if (row.organization?.status === "SUSPENDED") {
    return inspectMediaActivation({ ...toActivationRecord(row), status: "SUSPENDED" }, now);
  }
  return inspectMediaActivation(toActivationRecord(row), now);
}

export async function activateMediaPartnerAccount(input: { token: string; password: string }) {
  const activationTokenHash = hashInviteToken(input.token);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const account = await tx.mediaPartnerAccount.findUnique({
      where: { activationTokenHash },
      include: {
        user: { select: { id: true, email: true, passwordHash: true } },
        organization: { select: { status: true } },
      },
    });
    const outcome = inspectMediaPartnerActivation(account);
    if (outcome !== "ok" || !account?.user) {
      return { ok: false as const, outcome: outcome === "ok" ? ("invalid" as const) : outcome };
    }

    const claimed = await tx.mediaPartnerAccount.updateMany({
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
