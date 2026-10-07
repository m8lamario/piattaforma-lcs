import type { PublicationFlags } from "@/features/consents/domain/boxes";

export type RosterRow = {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  membershipRole?: "PLAYER" | "REPRESENTATIVE";
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
  registrationStatus: string;
  medicalStatus: "none" | "pending" | "approved" | "rejected" | "expired";
  publication?: PublicationFlags | null;
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
] as const;

export type RosterFilter = (typeof ROSTER_FILTERS)[number];
export type RosterBucket = Exclude<RosterFilter, "open" | "publication">;

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
  row: Pick<RosterRow, "registrationStatus" | "medicalStatus" | "publication">,
  filter: RosterFilter | null,
): boolean {
  if (!filter) return true;
  if (filter === "publication") return Boolean(row.publication && row.publication.status !== "publishable");
  if (filter === "open") {
    const bucket = rosterBucket(row);
    return bucket === "invited" || bucket === "inProgress" || bucket === "attention";
  }
  return rosterBucket(row) === filter;
}

export function filterRoster<T extends Pick<RosterRow, "registrationStatus" | "medicalStatus" | "publication">>(
  rows: T[],
  filter: RosterFilter | null,
): T[] {
  return rows.filter((row) => matchesRosterFilter(row, filter));
}

export function unpublishedCount(rows: Pick<RosterRow, "publication">[]): number {
  return rows.filter((row) => row.publication && row.publication.status !== "publishable").length;
}

export function toRosterRow(input: {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  membershipRole?: "PLAYER" | "REPRESENTATIVE";
  firstName: string;
  lastName: string;
  jerseyNumber?: string | null;
  rosterRole?: string | null;
  registrationStatus: string;
  medicalStatus?: string | null;
  publication?: PublicationFlags | null;
}): RosterRow {
  const medical =
    input.medicalStatus === "APPROVED"
      ? "approved"
      : input.medicalStatus === "REJECTED" || input.medicalStatus === "CHANGES_REQUESTED"
        ? "rejected"
        : input.medicalStatus === "EXPIRED"
          ? "expired"
          : input.medicalStatus === "PENDING_REVIEW" || input.medicalStatus === "UPLOADED"
            ? "pending"
            : "none";
  return {
    registrationId: input.registrationId,
    userId: input.userId,
    membershipId: input.membershipId,
    membershipRole: input.membershipRole,
    firstName: input.firstName,
    lastName: input.lastName,
    jerseyNumber: input.jerseyNumber ?? null,
    rosterRole: input.rosterRole ?? null,
    registrationStatus: input.registrationStatus,
    medicalStatus: medical,
    publication: input.publication ?? null,
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
