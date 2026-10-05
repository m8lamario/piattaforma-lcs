export function registrationMatchesTeam(input: {
  teamId: string;
  teamEditionId: string;
  registrationTeamId: string;
  registrationEditionId: string;
}) {
  return (
    input.registrationTeamId === input.teamId &&
    input.registrationEditionId === input.teamEditionId
  );
}

export function teamBelongsToCompetition(teamCompetitionId: string, competitionId: string) {
  return teamCompetitionId === competitionId;
}

export type PaymentScopeViolation =
  | "missing_scope"
  | "team_edition"
  | "registration_edition"
  | "registration_team";

export function paymentScopeViolation(input: {
  editionId: string;
  teamId?: string | null;
  teamEditionId?: string | null;
  registrationId?: string | null;
  registrationEditionId?: string | null;
  registrationTeamId?: string | null;
}): PaymentScopeViolation | null {
  const teamId = input.teamId ?? null;
  const registrationId = input.registrationId ?? null;
  if (!teamId && !registrationId) return "missing_scope";

  if (teamId && input.teamEditionId !== input.editionId) return "team_edition";

  if (registrationId && input.registrationEditionId !== input.editionId) {
    return "registration_edition";
  }

  if (registrationId && teamId && input.registrationTeamId !== teamId) {
    return "registration_team";
  }

  return null;
}

export function isTeamFeePayment(payment: { teamId: string | null; registrationId: string | null }) {
  return Boolean(payment.teamId) && !payment.registrationId;
}
