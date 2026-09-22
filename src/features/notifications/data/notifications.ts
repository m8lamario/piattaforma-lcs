import { emailAdapter } from "@/shared/adapters";
import { isMinor } from "@/features/players/domain/age";
import { prisma } from "@/shared/lib/prisma";

async function minorGuardianEmail(userId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: {
      birthDate: true,
      guardians: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
    },
  });
  if (!profile?.birthDate || !isMinor(profile.birthDate)) return null;
  return profile.guardians[0]?.email?.trim().toLowerCase() || null;
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
}) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (user?.email) {
    await emailAdapter.send({
      to: user.email,
      template: input.type,
      variables: { title: input.title },
    });
  }
  const guardianEmail = await minorGuardianEmail(input.userId);
  if (guardianEmail && guardianEmail !== user?.email?.toLowerCase()) {
    await emailAdapter.send({
      to: guardianEmail,
      template: input.type,
      variables: { title: input.title },
    });
  }
  return row;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
