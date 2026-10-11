import { getActorByUserId, isStaff, isMedicalReviewer, representativeTeamIds } from "@/shared/authz/getActor";
import { countUnreadNotifications } from "@/features/notifications/data/notifications";
import { prisma } from "@/shared/lib/prisma";
import { shellNavFlags } from "./shellNav";

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
          select: { id: true },
        },
      },
    }),
  ]);
  const registration = profile?.registrations[0];
  const flags = shellNavFlags({
    isRepresentative: actor ? representativeTeamIds(actor).length > 0 : false,
    isStaffOrReviewer: actor ? isStaff(actor) || isMedicalReviewer(actor) : false,
    hasMembership: Boolean(actor && actor.membershipTeamIds.length > 0),
    hasPlayerRegistration: Boolean(registration),
  });

  return {
    actor,
    ...flags,
    unreadCount,
  };
}
