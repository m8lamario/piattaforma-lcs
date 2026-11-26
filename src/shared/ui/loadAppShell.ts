import { cache } from "react";
import { authorize } from "@/shared/authz/authorize";
import {
  loadUserAccess,
  isStaff,
  isMedicalReviewer,
  isSuperAdmin,
  isLeagueSupervisorRole,
  representativeTeamIds,
} from "@/shared/authz/getActor";
import { countUnreadNotifications } from "@/features/notifications/data/notifications";
import { shellNavFlags } from "./shellNav";

export const loadAppShell = cache(async (userId: string) => {
  const [access, unreadCount] = await Promise.all([
    loadUserAccess(userId),
    countUnreadNotifications(userId),
  ]);
  const actor = access?.actor ?? null;
  const flags = shellNavFlags({
    isRepresentative: actor ? representativeTeamIds(actor).length > 0 : false,
    isStaffOrReviewer: actor ? isStaff(actor) || isMedicalReviewer(actor) : false,
    hasMembership: Boolean(actor && actor.membershipTeamIds.length > 0),
    hasPlayerRegistration: Boolean(access?.hasPlayerRegistration),
    canVerifyMedia: actor ? authorize(actor, "media:verify").allow : false,
    isSuperAdmin: actor ? isSuperAdmin(actor) : false,
    isLeagueSupervisor: actor ? isLeagueSupervisorRole(actor) : false,
  });

  return {
    actor,
    ...flags,
    unreadCount,
  };
});
