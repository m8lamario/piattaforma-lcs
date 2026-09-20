export type RosterRow = {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
  registrationStatus: string;
  medicalStatus: "none" | "pending" | "approved" | "rejected" | "expired";
};

export type RosterCounts = {
  total: number;
  invited: number;
  inProgress: number;
  attention: number;
  ok: number;
  withdrawn: number;
};

export function toRosterRow(input: {
  registrationId: string;
  userId?: string;
  membershipId?: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: string | null;
  rosterRole?: string | null;
  registrationStatus: string;
  medicalStatus?: string | null;
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
    firstName: input.firstName,
    lastName: input.lastName,
    jerseyNumber: input.jerseyNumber ?? null,
    rosterRole: input.rosterRole ?? null,
    registrationStatus: input.registrationStatus,
    medicalStatus: medical,
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
    if (row.registrationStatus === "WITHDRAWN") {
      counts.withdrawn += 1;
      continue;
    }
    if (row.registrationStatus === "APPROVED") {
      counts.ok += 1;
      continue;
    }
    if (
      row.registrationStatus === "CHANGES_REQUESTED" ||
      row.medicalStatus === "rejected" ||
      row.medicalStatus === "expired"
    ) {
      counts.attention += 1;
      continue;
    }
    if (row.registrationStatus === "INVITED" || row.registrationStatus === "ACCOUNT_CREATED") {
      counts.invited += 1;
      continue;
    }
    counts.inProgress += 1;
  }
  return counts;
}
