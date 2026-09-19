export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type InviteInspection =
  | { outcome: "invalid" }
  | { outcome: "expired" }
  | { outcome: "revoked" }
  | { outcome: "already_used" }
  | {
      outcome: "redeemable";
      email: string;
      firstName: string | null;
      lastName: string | null;
      teamId: string;
      teamName: string;
      editionId: string;
    };

export type InviteRecord = {
  status: InviteStatus;
  email: string;
  firstName: string | null;
  lastName: string | null;
  expiresAt: Date;
  teamId: string;
  teamName: string;
  editionId: string;
};

export function inspectInvite(
  invite: InviteRecord | null,
  now: Date = new Date(),
): InviteInspection {
  if (!invite) return { outcome: "invalid" };
  if (invite.status === "REVOKED") return { outcome: "revoked" };
  if (invite.status === "ACCEPTED") return { outcome: "already_used" };
  if (invite.status === "EXPIRED" || invite.expiresAt.getTime() <= now.getTime()) {
    return { outcome: "expired" };
  }
  if (invite.status !== "PENDING") return { outcome: "invalid" };

  return {
    outcome: "redeemable",
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    teamId: invite.teamId,
    teamName: invite.teamName,
    editionId: invite.editionId,
  };
}

export type RegistrationConflict = {
  editionId: string;
  teamId: string;
  status: string;
};

export type RedeemPath =
  | { path: "create_account" }
  | { path: "login_required" }
  | { path: "attach_existing" }
  | { path: "already_on_team" }
  | { path: "edition_conflict"; editionId: string }
  | { path: "wrong_session_email" };

export function decideRedeemPath(input: {
  inspection: InviteInspection;
  existingUser: { id: string; email: string } | null;
  session: { userId: string; email: string } | null;
  existingRegistrations: RegistrationConflict[];
}): RedeemPath {
  if (input.inspection.outcome !== "redeemable") {
    throw new Error("decideRedeemPath richiede un invito riscattabile.");
  }

  const invite = input.inspection;
  const inviteEmail = invite.email.toLowerCase();
  const { existingUser, session, existingRegistrations } = input;

  if (session && session.email.toLowerCase() !== inviteEmail) {
    return { path: "wrong_session_email" };
  }

  const sameEdition = existingRegistrations.find(
    (registration) => registration.editionId === invite.editionId,
  );
  if (sameEdition) {
    if (sameEdition.teamId === invite.teamId) {
      return { path: "already_on_team" };
    }
    return { path: "edition_conflict", editionId: sameEdition.editionId };
  }

  const otherActive = existingRegistrations.find(
    (registration) =>
      registration.editionId !== invite.editionId &&
      registration.status !== "WITHDRAWN",
  );
  if (otherActive) {
    return { path: "edition_conflict", editionId: otherActive.editionId };
  }

  if (!existingUser) {
    if (session) return { path: "wrong_session_email" };
    return { path: "create_account" };
  }

  if (session?.userId === existingUser.id) {
    return { path: "attach_existing" };
  }

  return { path: "login_required" };
}

export function inviteCreateBlocker(
  teamId: string,
  editionId: string,
  registrations: RegistrationConflict[],
): "already_on_team" | "edition_conflict" | null {
  const active = registrations.filter((registration) => registration.status !== "WITHDRAWN");
  if (active.some((registration) => registration.teamId === teamId)) {
    return "already_on_team";
  }
  if (active.some((registration) => registration.editionId === editionId)) {
    return "edition_conflict";
  }
  if (active.length > 0) {
    return "edition_conflict";
  }
  return null;
}
