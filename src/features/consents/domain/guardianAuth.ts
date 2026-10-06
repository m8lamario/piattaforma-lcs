import {
  MEDIA_USE_CODES,
  type ConsentBoxCode,
} from "@/features/consents/domain/boxes";

export const GUARDIAN_LINK_PURPOSES = ["AUTHORIZE", "REVOKE", "PUBLICATION"] as const;
export type GuardianLinkPurpose = (typeof GUARDIAN_LINK_PURPOSES)[number];

export const ENROLLMENT_REQUIRED_CODES: ConsentBoxCode[] = ["G1", "T1", "G2", "G4"];
export const PUBLICATION_CONFIRM_CODE: ConsentBoxCode = "C1";

export function normalizePersonName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function selfAsGuardianReason(input: {
  playerFirstName: string;
  playerLastName: string;
  playerEmail: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
}): "email" | "name" | null {
  if (input.guardianEmail.trim().toLowerCase() === input.playerEmail.trim().toLowerCase()) {
    return "email";
  }
  if (
    normalizePersonName(`${input.guardianFirstName} ${input.guardianLastName}`) ===
    normalizePersonName(`${input.playerFirstName} ${input.playerLastName}`)
  ) {
    return "name";
  }
  return null;
}

export function enrollmentBoxCodes(partnersPublished: boolean): ConsentBoxCode[] {
  const boxes: ConsentBoxCode[] = [
    "G1",
    "T1",
    "G2",
    "G3",
    "G4",
    "G5",
    "G6",
    ...(partnersPublished ? (["G7"] as const) : []),
    "G8",
    ...MEDIA_USE_CODES.minor,
  ];
  return boxes;
}

export function publicationBoxCodes(partnersPublished: boolean): ConsentBoxCode[] {
  return ["C1", "G5", ...(partnersPublished ? (["G7"] as const) : []), ...MEDIA_USE_CODES.minor];
}

export function revokeBoxCodes(partnersPublished: boolean): ConsentBoxCode[] {
  return ["G5", "G6", ...(partnersPublished ? (["G7"] as const) : []), "G8", ...MEDIA_USE_CODES.minor];
}

export function isOpenAuthorizationStatus(status: string) {
  return status === "PENDING" || status === "OPENED";
}

export function isAuthorizedStatus(status: string) {
  return status === "AUTHORIZED";
}

export type GuardianLinkStale = "used" | "expired" | "invalid";

export function inspectGuardianLink(input: {
  purpose: GuardianLinkPurpose;
  usedAt: Date | null;
  expiresAt: Date;
  authorization: { status: string } | null;
  now?: Date;
}): GuardianLinkStale | null {
  const now = input.now ?? new Date();
  if (input.usedAt) return "used";
  if (input.expiresAt.getTime() <= now.getTime()) return "expired";
  const auth = input.authorization;
  if (!auth || auth.status === "SUPERSEDED" || auth.status === "EXPIRED") return "invalid";
  if (input.purpose === "AUTHORIZE" || input.purpose === "PUBLICATION") {
    if (auth.status === "AUTHORIZED" || auth.status === "REFUSED" || auth.status === "REVOKED") {
      return "used";
    }
  }
  if (input.purpose === "REVOKE" && auth.status !== "AUTHORIZED") return "invalid";
  return null;
}

export function guardianAuthorizationChecklistStatus(input: {
  hasContact: boolean;
  enrollmentStatus: string | null;
}): "complete" | "todo" | "attention" {
  if (input.enrollmentStatus === "AUTHORIZED") return "complete";
  if (input.hasContact) return "attention";
  return "todo";
}
