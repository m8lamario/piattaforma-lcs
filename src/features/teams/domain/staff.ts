export const STAFF_SLOT_LIMIT = 5;
export const DEFAULT_STAFF_FEE_EUR = 5;

export type ParticipantCategory = "PLAYER" | "STAFF";

export function staffOccupiesSlot(status: string) {
  return status !== "WITHDRAWN" && status !== "REMOVED";
}

export function countStaffSlots(statuses: readonly string[]) {
  return statuses.filter(staffOccupiesSlot).length;
}

export function staffAdmission(occupied: number, limit = STAFF_SLOT_LIMIT) {
  if (!Number.isInteger(occupied) || occupied < 0) {
    return { ok: false as const, reason: "staff_limit" as const };
  }
  if (occupied >= limit) return { ok: false as const, reason: "staff_limit" as const };
  return { ok: true as const, occupied: occupied + 1 };
}

export type StaffRegistrationRef = {
  id: string;
  userId: string;
  teamId: string;
  editionId: string;
  category: ParticipantCategory;
  status: string;
};

export function decideRepresentativeStaffJoin(input: {
  userId: string;
  teamId: string;
  editionId: string;
  occupiedStaff: number;
  registration: StaffRegistrationRef | null;
}) {
  const row = input.registration;
  if (row && row.userId !== input.userId) {
    return { ok: false as const, reason: "identity_conflict" as const };
  }
  if (row && staffOccupiesSlot(row.status) && (row.teamId !== input.teamId || row.editionId !== input.editionId)) {
    return { ok: false as const, reason: "edition_conflict" as const };
  }
  if (row && row.teamId === input.teamId && row.category === "PLAYER" && staffOccupiesSlot(row.status)) {
    return { ok: false as const, reason: "category_conflict" as const };
  }
  if (row && row.teamId === input.teamId && row.category === "STAFF" && staffOccupiesSlot(row.status)) {
    return { ok: true as const, action: "already" as const, registrationId: row.id };
  }
  const needsSlot = !row || row.category !== "STAFF" || !staffOccupiesSlot(row.status);
  if (needsSlot && !staffAdmission(input.occupiedStaff).ok) {
    return { ok: false as const, reason: "staff_limit" as const };
  }
  if (row) return { ok: true as const, action: "reopen" as const, registrationId: row.id };
  return { ok: true as const, action: "create" as const };
}

export type CoachRegistrationRef = {
  id: string;
  teamId: string;
  category: ParticipantCategory;
  status: string;
};

export function coachSelectionBlocker(input: {
  teamId: string;
  registration: CoachRegistrationRef | null;
}) {
  if (!input.registration) return "missing" as const;
  if (input.registration.teamId !== input.teamId) return "wrong_team" as const;
  if (input.registration.category !== "STAFF") return "not_staff" as const;
  if (!staffOccupiesSlot(input.registration.status)) return "ineligible" as const;
  return null;
}

export function teamCoachCompleteness(input: {
  teamId: string;
  coachRegistrationId: string | null;
  coach: CoachRegistrationRef | null;
}) {
  if (!input.coachRegistrationId || !input.coach || input.coach.id !== input.coachRegistrationId) {
    return { complete: false as const, reason: "missing" as const };
  }
  const blocker = coachSelectionBlocker({ teamId: input.teamId, registration: input.coach });
  if (blocker) return { complete: false as const, reason: blocker };
  return { complete: true as const, reason: null };
}

export function profileNamesFromUser(user: { name: string | null; email: string }) {
  const name = user.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") };
    }
    return { firstName: name, lastName: "—" };
  }
  const local = user.email.split("@")[0] ?? "Staff";
  return { firstName: local.slice(0, 80) || "Staff", lastName: "—" };
}
