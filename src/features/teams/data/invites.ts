import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { hashPassword } from "@/features/auth/domain/password";
import { inspectInvite, type InviteRecord } from "../domain/invite";
import { createInviteToken, hashInviteToken } from "../domain/token";

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
    include: { team: true },
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
        emailVerified: new Date(),
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

export async function getTeamForActor(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      edition: { include: { competition: true } },
      school: true,
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
