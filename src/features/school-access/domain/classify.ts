export const SCHOOL_ACCESS_USER_ROLE = "TEAM_REPRESENTATIVE" as const;
export const SCHOOL_ACCESS_MEMBERSHIP_ROLE = "REPRESENTATIVE" as const;

export type SchoolAccessFacts = {
  emailHasAccount: boolean;
  schoolAlreadyOnEdition: boolean;
  pendingSameEmail: boolean;
  pendingSameSchoolEdition: boolean;
  approvedUnactivatedSameEmail: boolean;
  approvedUnactivatedSameSchoolEdition: boolean;
};

export type SchoolAccessBlockCode =
  | "SCHOOL_ACCESS_EMAIL_TAKEN"
  | "SCHOOL_ACCESS_SCHOOL_EXISTS"
  | "SCHOOL_ACCESS_ALREADY_APPROVED"
  | "SCHOOL_ACCESS_DUPLICATE";

export type SchoolAccessDecision = { ok: true } | { ok: false; code: SchoolAccessBlockCode };

export function classifySchoolAccessRequest(facts: SchoolAccessFacts): SchoolAccessDecision {
  if (facts.emailHasAccount) return { ok: false, code: "SCHOOL_ACCESS_EMAIL_TAKEN" };
  if (facts.schoolAlreadyOnEdition) return { ok: false, code: "SCHOOL_ACCESS_SCHOOL_EXISTS" };
  if (facts.approvedUnactivatedSameEmail || facts.approvedUnactivatedSameSchoolEdition) {
    return { ok: false, code: "SCHOOL_ACCESS_ALREADY_APPROVED" };
  }
  if (facts.pendingSameEmail || facts.pendingSameSchoolEdition) {
    return { ok: false, code: "SCHOOL_ACCESS_DUPLICATE" };
  }
  return { ok: true };
}

export function representativeProvisionRoles() {
  return {
    userRole: SCHOOL_ACCESS_USER_ROLE,
    membershipRole: SCHOOL_ACCESS_MEMBERSHIP_ROLE,
  } as const;
}

export function isPlatformAdminRole(role: string) {
  return role === "ORGANIZATION_ADMIN" || role === "SUPER_ADMIN" || role === "MEDICAL_REVIEWER";
}
