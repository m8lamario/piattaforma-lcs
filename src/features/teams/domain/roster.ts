import type { PublicationFlags } from "@/features/consents/domain/boxes";
import { staffOccupiesSlot } from "@/features/teams/domain/staff";

export type RosterGuardianState = "na" | "none" | "pending" | "authorized" | "refused";

export type RosterRow = {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  membershipRole?: "PLAYER" | "REPRESENTATIVE" | "STAFF";
  category: "PLAYER" | "STAFF";
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
  shirtSize: string | null;
  registrationStatus: string;
  medicalStatus: "none" | "pending" | "approved" | "rejected" | "expired";
  publication?: PublicationFlags | null;
  paymentCovered: boolean;
  consentDue: boolean;
  isCoach: boolean;
  emailVerified: boolean;
  guardianState: RosterGuardianState;
  personalDataComplete: boolean;
  privacyComplete: boolean;
  mediaComplete: boolean;
  sportEligible: boolean;
};

export type RosterCounts = {
  total: number;
  invited: number;
  inProgress: number;
  attention: number;
  ok: number;
  withdrawn: number;
};

export const ROSTER_FILTERS = [
  "open",
  "invited",
  "inProgress",
  "attention",
  "ok",
  "withdrawn",
  "publication",
  "unverified",
  "guardian",
  "unpaid",
  "medical",
] as const;

export type RosterFilter = (typeof ROSTER_FILTERS)[number];
export type RosterBucket = "invited" | "inProgress" | "attention" | "ok" | "withdrawn";

export function rosterBucket(row: Pick<RosterRow, "registrationStatus" | "medicalStatus">): RosterBucket {
  if (row.registrationStatus === "WITHDRAWN") return "withdrawn";
  if (row.registrationStatus === "APPROVED") return "ok";
  if (
    row.registrationStatus === "CHANGES_REQUESTED" ||
    row.medicalStatus === "rejected" ||
    row.medicalStatus === "expired"
  ) {
    return "attention";
  }
  if (row.registrationStatus === "INVITED" || row.registrationStatus === "ACCOUNT_CREATED") return "invited";
  return "inProgress";
}

export function parseRosterFilter(value: string | undefined | null): RosterFilter | null {
  if (!value) return null;
  return (ROSTER_FILTERS as readonly string[]).includes(value) ? (value as RosterFilter) : null;
}

export function rosterFilterHref(filter: RosterFilter | null): string {
  return filter ? `/squadra?stato=${filter}` : "/squadra";
}

export function matchesRosterFilter(
  row: Pick<
    RosterRow,
    | "registrationStatus"
    | "medicalStatus"
    | "publication"
    | "emailVerified"
    | "guardianState"
    | "paymentCovered"
    | "sportEligible"
    | "category"
  >,
  filter: RosterFilter | null,
): boolean {
  if (!filter) return true;
  if (row.registrationStatus === "WITHDRAWN") return filter === "withdrawn";
  if (filter === "publication") return Boolean(row.publication && row.publication.status !== "publishable");
  if (filter === "unverified") return row.emailVerified === false;
  if (filter === "guardian") {
    return row.guardianState === "none" || row.guardianState === "pending" || row.guardianState === "refused";
  }
  if (filter === "unpaid") return row.paymentCovered === false;
  if (filter === "medical") return row.category !== "STAFF" && row.sportEligible === false;
  if (filter === "open") {
    const bucket = rosterBucket(row);
    return bucket === "invited" || bucket === "inProgress" || bucket === "attention";
  }
  const bucket = rosterBucket(row);
  return bucket === filter;
}

export function filterRoster<
  T extends Pick<
    RosterRow,
    | "registrationStatus"
    | "medicalStatus"
    | "publication"
    | "emailVerified"
    | "guardianState"
    | "paymentCovered"
    | "sportEligible"
    | "category"
  >,
>(rows: T[], filter: RosterFilter | null): T[] {
  return rows.filter((row) => matchesRosterFilter(row, filter));
}

export type RosterCauseCounts = {
  unverified: number;
  guardian: number;
  unpaid: number;
  medical: number;
};

export function summarizeRosterCauses(
  rows: Parameters<typeof matchesRosterFilter>[0][],
): RosterCauseCounts {
  const counts: RosterCauseCounts = { unverified: 0, guardian: 0, unpaid: 0, medical: 0 };
  for (const row of rows) {
    if (matchesRosterFilter(row, "unverified")) counts.unverified += 1;
    if (matchesRosterFilter(row, "guardian")) counts.guardian += 1;
    if (matchesRosterFilter(row, "unpaid")) counts.unpaid += 1;
    if (matchesRosterFilter(row, "medical")) counts.medical += 1;
  }
  return counts;
}

export function toRosterRow(input: {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  membershipRole?: "PLAYER" | "REPRESENTATIVE" | "STAFF";
  category?: "PLAYER" | "STAFF";
  firstName: string;
  lastName: string;
  jerseyNumber?: string | null;
  rosterRole?: string | null;
  shirtSize?: string | null;
  registrationStatus: string;
  medicalStatus?: string | null;
  publication?: PublicationFlags | null;
  paymentCovered?: boolean;
  consentDue?: boolean;
  isCoach?: boolean;
  emailVerified?: boolean;
  guardianState?: RosterGuardianState;
  personalDataComplete?: boolean;
  privacyComplete?: boolean;
  mediaComplete?: boolean;
  sportEligible?: boolean;
}): RosterRow {
  const medical =
    input.medicalStatus === "APPROVED"
      ? "approved"
      : input.medicalStatus === "REJECTED" || input.medicalStatus === "CHANGES_REQUESTED"
        ? "rejected"
        : input.medicalStatus === "EXPIRED"
          ? "expired"
          : input.medicalStatus === "PENDING_REVIEW" ||
              input.medicalStatus === "UPLOADED" ||
              input.medicalStatus === "PROCESSING" ||
              input.medicalStatus === "PREVALIDATED"
            ? "pending"
            : "none";
  const category = input.category ?? "PLAYER";
  return {
    registrationId: input.registrationId,
    userId: input.userId,
    membershipId: input.membershipId,
    membershipRole: input.membershipRole,
    firstName: input.firstName,
    lastName: input.lastName,
    jerseyNumber: input.jerseyNumber ?? null,
    rosterRole: input.rosterRole ?? null,
    shirtSize: category === "STAFF" ? null : (input.shirtSize ?? null),
    registrationStatus: input.registrationStatus,
    medicalStatus: medical,
    publication: input.publication ?? null,
    category,
    paymentCovered: input.paymentCovered ?? false,
    consentDue: input.consentDue ?? false,
    isCoach: input.isCoach ?? false,
    emailVerified: input.emailVerified ?? true,
    guardianState: input.guardianState ?? "na",
    personalDataComplete: input.personalDataComplete ?? true,
    privacyComplete: input.privacyComplete ?? true,
    mediaComplete: input.mediaComplete ?? true,
    sportEligible: input.sportEligible ?? (category === "STAFF" || medical === "approved"),
  };
}

export function toStaffRosterView(row: RosterRow) {
  return {
    registrationId: row.registrationId,
    firstName: row.firstName,
    lastName: row.lastName,
    registrationStatus: row.registrationStatus,
    paymentCovered: row.paymentCovered,
    consentDue: row.consentDue,
    isCoach: row.isCoach,
  };
}

export type TeammateRow = {
  userId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
};

export function toTeammateRow(input: {
  userId: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: string | null;
  rosterRole?: string | null;
}): TeammateRow {
  return {
    userId: input.userId,
    firstName: input.firstName,
    lastName: input.lastName,
    jerseyNumber: input.jerseyNumber ?? null,
    rosterRole: input.rosterRole ?? null,
  };
}

export function splitRoster(rows: RosterRow[]) {
  const players = rows.filter((row) => row.category !== "STAFF");
  const staff = rows.filter((row) => row.category === "STAFF");
  return {
    players,
    staff,
    staffUsed: staff.filter((row) => staffOccupiesSlot(row.registrationStatus)).length,
  };
}

export function summarizeRoster(rows: Pick<RosterRow, "registrationStatus" | "medicalStatus">[]): RosterCounts {
  const counts: RosterCounts = {
    total: rows.length,
    invited: 0,
    inProgress: 0,
    attention: 0,
    ok: 0,
    withdrawn: 0,
  };
  for (const row of rows) {
    counts[rosterBucket(row)] += 1;
  }
  return counts;
}
