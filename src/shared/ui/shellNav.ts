export function shellNavFlags(input: {
  isRepresentative: boolean;
  isStaffOrReviewer: boolean;
  hasMembership: boolean;
  hasPlayerRegistration: boolean;
}) {
  return {
    showTeam: input.isRepresentative,
    showAdmin: input.isStaffOrReviewer,
    showSchool: input.isRepresentative,
    showPlayerTeam: input.hasMembership && !input.isRepresentative,
    showConsents: input.hasPlayerRegistration,
  };
}
