export function shellNavFlags(input: {
  isRepresentative: boolean;
  isStaffOrReviewer: boolean;
  hasMembership: boolean;
  hasPlayerRegistration: boolean;
  canVerifyMedia?: boolean;
  isSuperAdmin?: boolean;
  isLeagueSupervisor?: boolean;
}) {
  const isSuperAdmin = Boolean(input.isSuperAdmin);
  const canVerifyMedia = Boolean(input.canVerifyMedia);
  const isLeagueSupervisor = Boolean(input.isLeagueSupervisor);
  const mediaUnderAdmin = isSuperAdmin && canVerifyMedia;
  const showMedia = canVerifyMedia;
  const showLeague = isLeagueSupervisor;
  const showArea =
    !isSuperAdmin &&
    !isLeagueSupervisor &&
    (input.isRepresentative ||
      input.isStaffOrReviewer ||
      input.hasMembership ||
      input.hasPlayerRegistration ||
      !showMedia);
  return {
    showTeam: input.isRepresentative && !isLeagueSupervisor,
    showAdmin: input.isStaffOrReviewer && !isLeagueSupervisor,
    showSchool: input.isRepresentative && !isLeagueSupervisor,
    showPlayerTeam: input.hasMembership && !input.isRepresentative && !isLeagueSupervisor,
    showConsents: input.hasPlayerRegistration && !isLeagueSupervisor,
    showMedia: showMedia && !isLeagueSupervisor,
    mediaUnderAdmin,
    showArea,
    showLeague,
  };
}

export function homeForShellFlags(flags: {
  showMedia: boolean;
  showArea: boolean;
  showAdmin: boolean;
  mediaUnderAdmin: boolean;
  showLeague?: boolean;
}) {
  if (flags.showLeague) return "/lega";
  if (flags.showMedia && !flags.showArea && !flags.mediaUnderAdmin) return "/media";
  if (!flags.showArea && flags.showAdmin) return "/admin";
  return "/area";
}
