import type { Prisma } from "@generated/client";
import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { hashPassword } from "@/features/auth/domain/password";
import { displayNameFromEmail, namesFromEmail } from "@/features/teams/domain/emailName";
import {
  coachSelectionBlocker,
  profileNamesFromUser,
  staffAdmission,
  type ParticipantCategory,
} from "@/features/teams/domain/staff";
import { inspectInvite, type InviteRecord } from "../domain/invite";
import { createInviteToken, hashInviteToken } from "../domain/token";

type DbTransaction = Prisma.TransactionClient;

const OPEN_REGISTRATION = { notIn: ["WITHDRAWN", "REMOVED"] as ("WITHDRAWN" | "REMOVED")[] };

export function isConstraintError(error: unknown, marker: string) {
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  if (error && typeof error === "object" && "meta" in error) {
    parts.push(JSON.stringify((error as { meta?: unknown }).meta));
  }
  return parts.join(" ").includes(marker);
}

function toInviteRecord(invite: {
  status: InviteRecord["status"];
  email: string;
  firstName: string | null;
  lastName: string | null;
  expiresAt: Date;
  teamId: string;
  team: { name: string; editionId: string };
}): InviteRecord {
  return {
    status: invite.status,
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    expiresAt: invite.expiresAt,
    teamId: invite.teamId,
    teamName: invite.team.name,
    editionId: invite.team.editionId,
  };
}

export async function findInviteByPlainToken(token: string) {
  const tokenHash = hashInviteToken(token);
  const invite = await prisma.playerInvite.findUnique({
    where: { tokenHash },
    include: { team: { include: { edition: { include: { competition: true } } } } },
  });
  if (!invite) return null;

  const inspection = inspectInvite(toInviteRecord(invite));
  if (inspection.outcome === "expired" && invite.status === "PENDING") {
    await prisma.playerInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
  }

  return { invite, inspection };
}

export async function createPlayerInvite(input: {
  teamId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  invitedByUserId: string;
  origin: string;
}) {
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.$transaction(async (tx) => {
    await tx.playerInvite.updateMany({
      where: {
        teamId: input.teamId,
        email: input.email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    return tx.playerInvite.create({
      data: {
        teamId: input.teamId,
        email: input.email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        tokenHash,
        expiresAt,
        invitedByUserId: input.invitedByUserId,
      },
      include: { team: true },
    });
  });

  const redeemUrl = `${input.origin}/invito/${token}`;
  return { invite, token, redeemUrl };
}

export async function listTeamInvites(teamId: string) {
  const invites = await prisma.playerInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const now = Date.now();
  return invites.map((invite) => ({
    ...invite,
    status:
      invite.status === "PENDING" && invite.expiresAt.getTime() <= now
        ? ("EXPIRED" as const)
        : invite.status,
  }));
}

export async function revokePlayerInvite(inviteId: string, teamId: string) {
  const result = await prisma.playerInvite.updateMany({
    where: { id: inviteId, teamId, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  return result.count === 1;
}

export async function getPlayerInviteForTeam(inviteId: string, teamId: string) {
  return prisma.playerInvite.findFirst({
    where: { id: inviteId, teamId },
  });
}

export async function loadRedeemContext(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      playerProfile: {
        include: {
          registrations: {
            select: { editionId: true, teamId: true, status: true },
          },
        },
      },
    },
  });

  return {
    existingUser: existingUser
      ? { id: existingUser.id, email: existingUser.email }
      : null,
    existingRegistrations:
      existingUser?.playerProfile?.registrations.map((registration) => ({
        editionId: registration.editionId,
        teamId: registration.teamId,
        status: registration.status,
      })) ?? [],
  };
}

export async function createAccountFromInvite(input: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  const tokenHash = hashInviteToken(input.token);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.playerInvite.findUnique({
      where: { tokenHash },
      include: { team: true },
    });
    if (!invite) return { ok: false as const, reason: "invalid" as const };

    const inspection = inspectInvite(toInviteRecord(invite));
    if (inspection.outcome !== "redeemable") {
      return { ok: false as const, reason: inspection.outcome };
    }

    const email = invite.email.toLowerCase();
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false as const, reason: "login_required" as const };
    }

    const passwordHash = await hashPassword(input.password);
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: `${input.firstName} ${input.lastName}`.trim(),
        roles: { create: { role: "PLAYER" } },
        playerProfile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
      include: { playerProfile: true },
    });

    if (!user.playerProfile) {
      throw new Error("PlayerProfile non creato.");
    }

    const claimed = await tx.playerInvite.updateMany({
      where: {
        id: invite.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: {
        status: "ACCEPTED",
        acceptedByUserId: user.id,
      },
    });
    if (claimed.count !== 1) {
      throw new Error("INVITE_RACE");
    }

    await tx.teamMembership.create({
      data: {
        teamId: invite.teamId,
        userId: user.id,
        role: "PLAYER",
      },
    });

    await tx.registration.create({
      data: {
        playerProfileId: user.playerProfile.id,
        teamId: invite.teamId,
        editionId: invite.team.editionId,
        status: "ACCOUNT_CREATED",
      },
    });

    return {
      ok: true as const,
      user: { id: user.id, email: user.email },
      teamName: invite.team.name,
    };
  });
}

export async function attachExistingUserToInvite(input: {
  token: string;
  userId: string;
  email: string;
}) {
  const tokenHash = hashInviteToken(input.token);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.playerInvite.findUnique({
      where: { tokenHash },
      include: { team: true },
    });
    if (!invite) return { ok: false as const, reason: "invalid" as const };

    const inspection = inspectInvite(toInviteRecord(invite));
    if (inspection.outcome !== "redeemable") {
      return { ok: false as const, reason: inspection.outcome };
    }
    if (invite.email.toLowerCase() !== input.email.toLowerCase()) {
      return { ok: false as const, reason: "wrong_session_email" as const };
    }

    const profile =
      (await tx.playerProfile.findUnique({ where: { userId: input.userId } })) ??
      (await tx.playerProfile.create({
        data: {
          userId: input.userId,
          firstName: invite.firstName ?? input.email.split("@")[0] ?? "Giocatore",
          lastName: invite.lastName ?? "—",
        },
      }));

    const playerRole = await tx.userRole.findFirst({
      where: { userId: input.userId, role: "PLAYER" },
    });
    if (!playerRole) {
      await tx.userRole.create({ data: { userId: input.userId, role: "PLAYER" } });
    }

    const claimed = await tx.playerInvite.updateMany({
      where: {
        id: invite.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: "ACCEPTED", acceptedByUserId: input.userId },
    });
    if (claimed.count !== 1) {
      throw new Error("INVITE_RACE");
    }

    await tx.teamMembership.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: input.userId } },
      update: {},
      create: { teamId: invite.teamId, userId: input.userId, role: "PLAYER" },
    });

    const existingRegistration = await tx.registration.findUnique({
      where: {
        playerProfileId_editionId: {
          playerProfileId: profile.id,
          editionId: invite.team.editionId,
        },
      },
    });
    if (!existingRegistration) {
      await tx.registration.create({
        data: {
          playerProfileId: profile.id,
          teamId: invite.teamId,
          editionId: invite.team.editionId,
          status: "ACCOUNT_CREATED",
        },
      });
    } else if (
      existingRegistration.teamId === invite.teamId &&
      (existingRegistration.status === "REMOVED" || existingRegistration.status === "WITHDRAWN")
    ) {
      await tx.registration.update({
        where: { id: existingRegistration.id },
        data: { status: "ACCOUNT_CREATED", teamId: invite.teamId },
      });
    }

    return { ok: true as const, teamName: invite.team.name };
  });
}

export async function findTeamByRegistrationToken(token: string) {
  return prisma.team.findUnique({
    where: { registrationToken: token },
    include: { edition: { include: { competition: true } } },
  });
}

async function lockTeamRow(tx: DbTransaction, teamId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
}

async function linkPlayerToTeam(
  tx: DbTransaction,
  input: {
    userId: string;
    profileId: string;
    teamId: string;
    editionId: string;
    category: ParticipantCategory;
  },
) {
  const existingRegistration = await tx.registration.findUnique({
    where: {
      playerProfileId_editionId: {
        playerProfileId: input.profileId,
        editionId: input.editionId,
      },
    },
  });
  const occupying =
    existingRegistration != null &&
    existingRegistration.status !== "WITHDRAWN" &&
    existingRegistration.status !== "REMOVED";
  if (occupying && existingRegistration.teamId === input.teamId && existingRegistration.category !== input.category) {
    return { ok: false as const, reason: "category_conflict" as const };
  }
  if (occupying && existingRegistration.teamId === input.teamId) {
    return { ok: false as const, reason: "already_on_team" as const };
  }
  if (existingRegistration && existingRegistration.teamId !== input.teamId) {
    return { ok: false as const, reason: "edition_conflict" as const };
  }

  if (input.category === "STAFF") {
    await lockTeamRow(tx, input.teamId);
    const occupied = await tx.registration.count({
      where: {
        teamId: input.teamId,
        category: "STAFF",
        status: OPEN_REGISTRATION,
        ...(existingRegistration ? { id: { not: existingRegistration.id } } : {}),
      },
    });
    if (!staffAdmission(occupied).ok) {
      return { ok: false as const, reason: "staff_limit" as const };
    }
  }

  const existingMembership = await tx.teamMembership.findUnique({
    where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
  });
  if (!existingMembership) {
    await tx.teamMembership.create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        role: input.category === "STAFF" ? "STAFF" : "PLAYER",
      },
    });
  } else if (existingMembership.role !== "REPRESENTATIVE") {
    await tx.teamMembership.update({
      where: { id: existingMembership.id },
      data: { role: input.category === "STAFF" ? "STAFF" : "PLAYER" },
    });
  }

  if (!existingRegistration) {
    await tx.registration.create({
      data: {
        playerProfileId: input.profileId,
        teamId: input.teamId,
        editionId: input.editionId,
        category: input.category,
        status: "ACCOUNT_CREATED",
      },
    });
    return { ok: true as const };
  }

  await tx.registration.update({
    where: { id: existingRegistration.id },
    data: { status: "ACCOUNT_CREATED", teamId: input.teamId, category: input.category },
  });
  return { ok: true as const };
}

export async function createAccountFromTeamLink(input: {
  token: string;
  email: string;
  password: string;
  category: ParticipantCategory;
}) {
  const email = input.email.toLowerCase();
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { registrationToken: input.token },
      include: { edition: true },
    });
    if (!team) return { ok: false as const, reason: "invalid" as const };

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) return { ok: false as const, reason: "login_required" as const };

    const { firstName, lastName } = namesFromEmail(email);
    const passwordHash = await hashPassword(input.password);
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: displayNameFromEmail(email),
        roles: { create: { role: "PLAYER" } },
        playerProfile: { create: { firstName, lastName } },
      },
      include: { playerProfile: true },
    });
    if (!user.playerProfile) throw new Error("PlayerProfile non creato.");

    const linked = await linkPlayerToTeam(tx, {
      userId: user.id,
      profileId: user.playerProfile.id,
      teamId: team.id,
      editionId: team.editionId,
      category: input.category,
    });
    if (!linked.ok) return linked;

    return {
      ok: true as const,
      user: { id: user.id, email: user.email },
      teamId: team.id,
      teamName: team.name,
    };
  });
}

export async function attachExistingUserToTeamLink(input: {
  token: string;
  userId: string;
  email: string;
  category: ParticipantCategory;
}) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { registrationToken: input.token } });
    if (!team) return { ok: false as const, reason: "invalid" as const };

    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user || user.email.toLowerCase() !== input.email.toLowerCase()) {
      return { ok: false as const, reason: "wrong_session_email" as const };
    }

    const profile =
      (await tx.playerProfile.findUnique({ where: { userId: input.userId } })) ??
      (await tx.playerProfile.create({
        data: {
          userId: input.userId,
          ...namesFromEmail(input.email),
        },
      }));

    const playerRole = await tx.userRole.findFirst({
      where: { userId: input.userId, role: "PLAYER" },
    });
    if (!playerRole) {
      await tx.userRole.create({ data: { userId: input.userId, role: "PLAYER" } });
    }

    const linked = await linkPlayerToTeam(tx, {
      userId: input.userId,
      profileId: profile.id,
      teamId: team.id,
      editionId: team.editionId,
      category: input.category,
    });
    if (!linked.ok) return linked;
    return { ok: true as const, teamId: team.id, teamName: team.name };
  });
}

export async function enrollRepresentativeAsStaff(input: { userId: string; teamId: string }) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: input.teamId } });
    if (!team) return { ok: false as const, reason: "not_found" as const };
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      include: { playerProfile: true },
    });
    if (!user || user.lifecycleStatus !== "ACTIVE") {
      return { ok: false as const, reason: "invalid" as const };
    }
    const profile =
      user.playerProfile ??
      (await tx.playerProfile.create({
        data: { userId: user.id, ...profileNamesFromUser(user) },
      }));
    return linkPlayerToTeam(tx, {
      userId: user.id,
      profileId: profile.id,
      teamId: team.id,
      editionId: team.editionId,
      category: "STAFF",
    });
  });
}

export async function designateTeamCoach(input: { teamId: string; registrationId: string }) {
  return prisma.$transaction(async (tx) => {
    await lockTeamRow(tx, input.teamId);
    const registration = await tx.registration.findFirst({
      where: { id: input.registrationId, teamId: input.teamId },
      select: { id: true, teamId: true, category: true, status: true },
    });
    const blocker = coachSelectionBlocker({ teamId: input.teamId, registration });
    if (blocker) return { ok: false as const, reason: blocker };
    await tx.team.update({
      where: { id: input.teamId },
      data: { coachRegistrationId: input.registrationId },
    });
    return { ok: true as const };
  });
}

export async function getTeamForActor(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      edition: { include: { competition: true } },
      school: true,
      coachRegistration: {
        select: {
          id: true,
          teamId: true,
          category: true,
          status: true,
          playerProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export async function getPlayerAreaSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      playerProfile: {
        include: {
          registrations: {
            include: {
              team: { include: { edition: { include: { competition: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const registration = user?.playerProfile?.registrations[0];
  return {
    email: user?.email ?? null,
    firstName: user?.playerProfile?.firstName ?? null,
    lastName: user?.playerProfile?.lastName ?? null,
    registration: registration
      ? {
          status: registration.status,
          teamName: registration.team.name,
          competitionName: registration.team.edition.competition.name,
          editionName: registration.team.edition.name,
        }
      : null,
  };
}
