import { emailAdapter } from "@/shared/adapters";
import { prisma } from "@/shared/lib/prisma";

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

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
