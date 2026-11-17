import { isMedicalExpired } from "@/features/documents/domain/retention";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";

export const LEAGUE_MEDICAL_STATUSES = ["none", "pending", "approved", "rejected", "expired"] as const;
export type LeagueMedicalStatus = (typeof LEAGUE_MEDICAL_STATUSES)[number];

export const LEAGUE_PAYMENT_STATUSES = ["paid", "pending", "not_due"] as const;
export type LeaguePaymentStatus = (typeof LEAGUE_PAYMENT_STATUSES)[number];

export const LEAGUE_SCHOOL_STATUSES = ["completed", "in_progress", "issues", "empty"] as const;
export type LeagueSchoolStatus = (typeof LEAGUE_SCHOOL_STATUSES)[number];

export const LEAGUE_REGISTRATION_STATUSES = [
  "INVITED",
  "ACCOUNT_CREATED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PAYMENT_PENDING",
  "APPROVED",
  "WITHDRAWN",
] as const;
export type LeagueRegistrationStatus = (typeof LEAGUE_REGISTRATION_STATUSES)[number];

export const LEAGUE_SORTS = ["lastName", "school", "status", "medical", "payment", "completedAt"] as const;
export type LeagueSort = (typeof LEAGUE_SORTS)[number];

export type LeaguePlayerRecord = {
  registrationId: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  schoolName: string;
  teamName: string;
  teamCountInSchool: number;
  registrationStatus: LeagueRegistrationStatus;
  medicalStatus: LeagueMedicalStatus;
  paymentStatus: LeaguePaymentStatus;
  completedAt: string | null;
};

export type LeagueSchoolRecord = {
  schoolId: string;
  schoolName: string;
  city: string;
  teamNames: string[];
  playerCount: number;
  completedCount: number;
  incompleteCount: number;
  withdrawnCount: number;
  percent: number;
  status: LeagueSchoolStatus;
  issues: Array<"medical" | "changes" | "payment">;
};

export type LeagueOverview = {
  schoolCount: number;
  schoolsCompleted: number;
  schoolsInProgress: number;
  schoolsWithIssues: number;
  playerCount: number;
  completedPlayers: number;
  docsComplete: number;
  docsDue: number;
  paymentsDue: number;
  percent: number;
};

export function isLeagueMedicalStatus(value: string): value is LeagueMedicalStatus {
  return (LEAGUE_MEDICAL_STATUSES as readonly string[]).includes(value);
}

export function isLeaguePaymentStatus(value: string): value is LeaguePaymentStatus {
  return (LEAGUE_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isLeagueRegistrationStatus(value: string): value is LeagueRegistrationStatus {
  return (LEAGUE_REGISTRATION_STATUSES as readonly string[]).includes(value);
}

export function isLeagueSort(value: string): value is LeagueSort {
  return (LEAGUE_SORTS as readonly string[]).includes(value);
}

export function leagueMedicalStatus(
  status: string | null | undefined,
  expiresAt: Date | null | undefined,
  now = new Date(),
): LeagueMedicalStatus {
  if (status === "APPROVED" && isMedicalExpired(expiresAt ?? null, now)) return "expired";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (
    status === "PENDING_REVIEW" ||
    status === "UPLOADED" ||
    status === "PROCESSING" ||
    status === "PREVALIDATED"
  ) {
    return "pending";
  }
  return "none";
}

export function leaguePaymentStatus(input: {
  paymentMode: "PLAYER" | "TEAM" | "BOTH";
  playerSucceeded: boolean;
  teamSucceeded: boolean;
}): LeaguePaymentStatus {
  if (
    isPaymentCovered({
      mode: input.paymentMode,
      playerSucceeded: input.playerSucceeded,
      teamSucceeded: input.teamSucceeded,
    })
  ) {
    return "paid";
  }
  if (input.paymentMode === "PLAYER" && !input.playerSucceeded && !input.teamSucceeded) {
    return "pending";
  }
  if (input.paymentMode === "TEAM" && !input.teamSucceeded) return "pending";
  if (input.paymentMode === "BOTH") return "pending";
  return "not_due";
}

export function leagueCompletionDate(status: string, reviewedAt: Date | null) {
  if (status !== "APPROVED" || !reviewedAt) return null;
  return reviewedAt.toISOString();
}

export function isActiveLeaguePlayer(status: string) {
  return status !== "WITHDRAWN" && status !== "REMOVED";
}

function schoolIssues(players: LeaguePlayerRecord[]): Array<"medical" | "changes" | "payment"> {
  const issues = new Set<"medical" | "changes" | "payment">();
  for (const player of players) {
    if (!isActiveLeaguePlayer(player.registrationStatus)) continue;
    if (player.medicalStatus === "rejected" || player.medicalStatus === "expired") issues.add("medical");
    if (player.registrationStatus === "CHANGES_REQUESTED") issues.add("changes");
    if (player.paymentStatus === "pending") issues.add("payment");
  }
  return [...issues];
}

export function summarizeLeagueSchool(
  school: { schoolId: string; schoolName: string; city: string; teamNames: string[] },
  players: LeaguePlayerRecord[],
): LeagueSchoolRecord {
  const active = players.filter((player) => isActiveLeaguePlayer(player.registrationStatus));
  const completedCount = active.filter((player) => player.registrationStatus === "APPROVED").length;
  const incompleteCount = active.length - completedCount;
  const withdrawnCount = players.filter((player) => player.registrationStatus === "WITHDRAWN").length;
  const issues = schoolIssues(players);
  const percent = active.length === 0 ? 0 : Math.round((completedCount / active.length) * 100);
  let status: LeagueSchoolStatus = "in_progress";
  if (active.length === 0) status = "empty";
  else if (issues.length > 0) status = "issues";
  else if (incompleteCount === 0) status = "completed";
  return {
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    city: school.city,
    teamNames: school.teamNames,
    playerCount: active.length,
    completedCount,
    incompleteCount,
    withdrawnCount,
    percent,
    status,
    issues,
  };
}

export function summarizeLeagueOverview(schools: LeagueSchoolRecord[], players: LeaguePlayerRecord[]): LeagueOverview {
  const active = players.filter((player) => isActiveLeaguePlayer(player.registrationStatus));
  const completedPlayers = active.filter((player) => player.registrationStatus === "APPROVED").length;
  const docsComplete = active.filter((player) => player.medicalStatus === "approved").length;
  return {
    schoolCount: schools.length,
    schoolsCompleted: schools.filter((school) => school.status === "completed").length,
    schoolsInProgress: schools.filter((school) => school.status === "in_progress").length,
    schoolsWithIssues: schools.filter((school) => school.status === "issues").length,
    playerCount: active.length,
    completedPlayers,
    docsComplete,
    docsDue: active.length - docsComplete,
    paymentsDue: active.filter((player) => player.paymentStatus === "pending").length,
    percent: active.length === 0 ? 0 : Math.round((completedPlayers / active.length) * 100),
  };
}

export type LeaguePlayerFilters = {
  q?: string;
  schoolId?: string;
  status?: LeagueRegistrationStatus;
  medical?: LeagueMedicalStatus;
  payment?: LeaguePaymentStatus;
  sort?: LeagueSort;
  dir?: "asc" | "desc";
};

function compareIt(a: string, b: string) {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

export function matchesLeaguePlayerFilters(row: LeaguePlayerRecord, filters: LeaguePlayerFilters) {
  if (filters.q) {
    const needle = filters.q.trim().toLocaleLowerCase("it");
    const haystack = `${row.firstName} ${row.lastName}`.toLocaleLowerCase("it");
    if (!haystack.includes(needle)) return false;
  }
  if (filters.schoolId && row.schoolId !== filters.schoolId) return false;
  if (filters.status && row.registrationStatus !== filters.status) return false;
  if (filters.medical && row.medicalStatus !== filters.medical) return false;
  if (filters.payment && row.paymentStatus !== filters.payment) return false;
  return true;
}

export function filterLeaguePlayers(rows: LeaguePlayerRecord[], filters: LeaguePlayerFilters) {
  const filtered = rows.filter((row) => matchesLeaguePlayerFilters(row, filters));
  const sort = filters.sort ?? "lastName";
  const dir = filters.dir === "desc" ? -1 : 1;
  return [...filtered].sort((a, b) => {
    const value = (() => {
      switch (sort) {
        case "school":
          return compareIt(a.schoolName, b.schoolName) || compareIt(a.lastName, b.lastName);
        case "status":
          return compareIt(a.registrationStatus, b.registrationStatus) || compareIt(a.lastName, b.lastName);
        case "medical":
          return compareIt(a.medicalStatus, b.medicalStatus) || compareIt(a.lastName, b.lastName);
        case "payment":
          return compareIt(a.paymentStatus, b.paymentStatus) || compareIt(a.lastName, b.lastName);
        case "completedAt":
          return compareIt(a.completedAt ?? "", b.completedAt ?? "") || compareIt(a.lastName, b.lastName);
        default:
          return compareIt(a.lastName, b.lastName) || compareIt(a.firstName, b.firstName);
      }
    })();
    return value * dir;
  });
}

export function leaguePlayersWhere(editionId: string) {
  return {
    editionId,
    category: "PLAYER" as const,
    status: { not: "REMOVED" as const },
  };
}
