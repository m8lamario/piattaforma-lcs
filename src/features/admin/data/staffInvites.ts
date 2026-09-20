import { INVITE_TTL_DAYS } from "@/shared/config/app";
import { prisma } from "@/shared/lib/prisma";
import { hashPassword } from "@/features/auth/domain/password";
import { inspectInvite, type InviteRecord } from "@/features/teams/domain/invite";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";

function toRecord(invite: {
  status: InviteRecord["status"];
  email: string;
  expiresAt: Date;
  teamId: string;
  team: { name: string; editionId: string };
}): InviteRecord {
  return {
    status: invite.status,
    email: invite.email,
    firstName: null,
    lastName: null,
    expiresAt: invite.expiresAt,
    teamId: invite.teamId,
    teamName: invite.team.name,
    editionId: invite.team.editionId,
  };
}

export async function findStaffInviteByPlainToken(token: string) {
  const tokenHash = hashInviteToken(token);
  const invite = await prisma.staffInvite.findUnique({
    where: { tokenHash },
    include: { team: true },
  });
  if (!invite) return null;
  const inspection = inspectInvite(toRecord(invite));
  if (inspection.outcome === "expired" && invite.status === "PENDING") {
    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
  }
  return { invite, inspection };
}

export async function createStaffInvite(input: {
  teamId: string;
  email: string;
  invitedByUserId: string;
  origin: string;
}) {
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.$transaction(async (tx) => {
    await tx.staffInvite.updateMany({
      where: { teamId: input.teamId, email: input.email, status: "PENDING" },
      data: { status: "REVOKED" },
    });
    return tx.staffInvite.create({
      data: {
        teamId: input.teamId,
        email: input.email,
        tokenHash,
        expiresAt,
        invitedByUserId: input.invitedByUserId,
      },
      include: { team: true },
    });
  });

  return { invite, token, redeemUrl: `${input.origin}/invito-staff/${token}` };
}

export async function redeemStaffInvite(input: {
  token: string;
  password?: string;
  sessionUserId?: string;
}) {
  const tokenHash = hashInviteToken(input.token);
  return prisma.$transaction(async (tx) => {
    const invite = await tx.staffInvite.findUnique({
      where: { tokenHash },
      include: { team: true },
    });
    if (!invite) return { ok: false as const, reason: "invalid" as const };
    const inspection = inspectInvite(toRecord(invite));
    if (inspection.outcome !== "redeemable") {
      return { ok: false as const, reason: inspection.outcome };
    }

    const email = invite.email.toLowerCase();
    let user = await tx.user.findUnique({ where: { email } });

    if (!user) {
      if (input.sessionUserId) return { ok: false as const, reason: "wrong_session_email" as const };
      if (!input.password) return { ok: false as const, reason: "create_account" as const };
      user = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(input.password),
          emailVerified: new Date(),
          name: invite.team.name,
        },
      });
    } else if (input.sessionUserId && input.sessionUserId !== user.id) {
      return { ok: false as const, reason: "wrong_session_email" as const };
    } else if (!input.sessionUserId) {
      return { ok: false as const, reason: "login_required" as const };
    }

    const claimed = await tx.staffInvite.updateMany({
      where: { id: invite.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "ACCEPTED", acceptedByUserId: user.id },
    });
    if (claimed.count !== 1) throw new Error("INVITE_RACE");

    const existingRole = await tx.userRole.findFirst({
      where: { userId: user.id, role: "TEAM_REPRESENTATIVE", teamId: invite.teamId },
    });
    if (!existingRole) {
      await tx.userRole.create({
        data: { userId: user.id, role: "TEAM_REPRESENTATIVE", teamId: invite.teamId },
      });
    }

    await tx.teamMembership.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
      update: { role: "REPRESENTATIVE" },
      create: { teamId: invite.teamId, userId: user.id, role: "REPRESENTATIVE" },
    });

    await tx.team.update({
      where: { id: invite.teamId },
      data: { representativeUserId: user.id, contactEmail: email },
    });

    return { ok: true as const, user: { id: user.id, email: user.email }, teamName: invite.team.name };
  });
}
