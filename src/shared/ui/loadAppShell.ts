import { getActorByUserId, isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { countUnreadNotifications } from "@/features/notifications/data/notifications";
import { isTerminalRegistrationStatus } from "@/features/registrations/domain/requirements";
import { prisma } from "@/shared/lib/prisma";

export async function loadAppShell(userId: string) {
  const [actor, unreadCount, profile] = await Promise.all([
    getActorByUserId(userId),
    countUnreadNotifications(userId),
    prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        registrations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    }),
  ]);
  const registration = profile?.registrations[0];
  const withdrawRegistrationId =
    registration && !isTerminalRegistrationStatus(registration.status) ? registration.id : null;

  return {
    actor,
    showTeam: actor ? representativeTeamIds(actor).length > 0 : false,
    showAdmin: actor ? isStaff(actor) : false,
    showPlayerTeam: Boolean(actor && actor.membershipTeamIds.length > 0),
    unreadCount,
    withdrawRegistrationId,
  };
}
