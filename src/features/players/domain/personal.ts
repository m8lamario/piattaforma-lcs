export type PersonalDataSnapshot = {
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  fiscalCode: string | null;
  phone: string | null;
};

export function hasCompletePersonalData(profile: PersonalDataSnapshot) {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.birthDate &&
      profile.fiscalCode?.trim() &&
      profile.phone?.trim(),
  );
}

export function hasCompleteGuardian(guardian: {
  firstName: string | null;
  lastName: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
} | null) {
  if (!guardian) return false;
  return Boolean(
    guardian.firstName?.trim() &&
      guardian.lastName?.trim() &&
      guardian.relationship?.trim() &&
      guardian.email?.trim() &&
      guardian.phone?.trim(),
  );
}

export const GUARDIAN_RELATIONSHIPS = ["GENITORE", "TUTORE", "AFFIDATARIO", "ALTRO"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
