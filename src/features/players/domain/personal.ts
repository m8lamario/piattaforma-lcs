import { isValidShirtSize } from "@/features/players/domain/shirtSize";

export type PersonalDataSnapshot = {
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  fiscalCode: string | null;
  phone: string | null;
  shirtSize?: string | null;
};

export function hasIdentityPersonalData(profile: PersonalDataSnapshot) {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.birthDate &&
      profile.fiscalCode?.trim() &&
      profile.phone?.trim(),
  );
}

export function hasCompletePersonalData(
  profile: PersonalDataSnapshot,
  options: { requireShirtSize?: boolean } = {},
) {
  if (!hasIdentityPersonalData(profile)) return false;
  if (options.requireShirtSize === false) return true;
  return isValidShirtSize(profile.shirtSize);
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

export function hasMinorGuardianRequirement(input: {
  primary: Parameters<typeof hasCompleteGuardian>[0];
  secondaryEmail?: string | null;
  g3: "OTHER_PARENT" | "SOLE" | null;
}) {
  if (!hasCompleteGuardian(input.primary)) return false;
  if (input.g3 === "SOLE") return true;
  if (input.g3 === "OTHER_PARENT") return Boolean(input.secondaryEmail?.trim());
  return false;
}

export const GUARDIAN_RELATIONSHIPS = ["GENITORE", "TUTORE", "AFFIDATARIO", "ALTRO"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
