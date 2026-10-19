export function shellNavFlags(input: {
  isRepresentative: boolean;
  isStaffOrReviewer: boolean;
  hasMembership: boolean;
  hasPlayerRegistration: boolean;
  canVerifyMedia?: boolean;
  isSuperAdmin?: boolean;
}) {
  const isSuperAdmin = Boolean(input.isSuperAdmin);
  const canVerifyMedia = Boolean(input.canVerifyMedia);
  const mediaUnderAdmin = isSuperAdmin && canVerifyMedia;
  const showMedia = canVerifyMedia;
  const showArea =
    !isSuperAdmin &&
    (input.isRepresentative ||
      input.isStaffOrReviewer ||
      input.hasMembership ||
      input.hasPlayerRegistration ||
      !showMedia);
  return {
    showTeam: input.isRepresentative,
    showAdmin: input.isStaffOrReviewer,
    showSchool: input.isRepresentative,
    showPlayerTeam: input.hasMembership && !input.isRepresentative,
    showConsents: input.hasPlayerRegistration,
    showMedia,
    mediaUnderAdmin,
    showArea,
  };
}
