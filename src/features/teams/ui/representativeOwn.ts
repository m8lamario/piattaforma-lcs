import type { PlayerWorkspace } from "@/features/registrations/data/workspace";

/** Plain subset of the workspace that the client-side representative flow needs (no Prisma Decimal). */
export type RepresentativeOwnRegistration = {
  registrationId: string;
  email: string;
  profile: PlayerWorkspace["profile"];
  identityConflict: PlayerWorkspace["identityConflict"];
  projectedStatus: PlayerWorkspace["projectedStatus"];
  checklist: PlayerWorkspace["checklist"];
  medicalStatus: PlayerWorkspace["evidence"]["medicalStatus"];
  sportEligible: boolean;
  category: PlayerWorkspace["registration"]["category"];
  publication: PlayerWorkspace["publication"];
  shirtSizeOnlyGap: boolean;
};

export function toRepresentativeOwnRegistration(workspace: PlayerWorkspace): RepresentativeOwnRegistration {
  return {
    registrationId: workspace.registration.id,
    email: workspace.user.email,
    profile: workspace.profile,
    identityConflict: workspace.identityConflict,
    projectedStatus: workspace.projectedStatus,
    checklist: workspace.checklist,
    medicalStatus: workspace.evidence.medicalStatus,
    sportEligible: workspace.sportEligibility.eligible,
    category: workspace.registration.category,
    publication: workspace.publication,
    shirtSizeOnlyGap: workspace.shirtSizeOnlyGap,
  };
}
