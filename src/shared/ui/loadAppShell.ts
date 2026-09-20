import { getActorByUserId, isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { countUnreadNotifications } from "@/features/notifications/data/notifications";

export async function loadAppShell(userId: string) {
  const actor = await getActorByUserId(userId);
  const unreadCount = await countUnreadNotifications(userId);
  return {
    actor,
    showTeam: actor ? representativeTeamIds(actor).length > 0 : false,
    showAdmin: actor ? isStaff(actor) : false,
    showPlayerTeam: Boolean(actor && actor.membershipTeamIds.length > 0),
    unreadCount,
  };
}
