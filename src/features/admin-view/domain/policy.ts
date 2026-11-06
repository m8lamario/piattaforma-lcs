import type { Role } from "@/shared/authz/types";

export type ViewStartDecision =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "self" | "unavailable" | "confirm" };

export function decideAdminViewStart(input: {
  viewerCan: boolean;
  sameUser: boolean;
  targetActive: boolean;
  confirmed: boolean;
}): ViewStartDecision {
  if (!input.viewerCan) return { ok: false, reason: "forbidden" };
  if (!input.confirmed) return { ok: false, reason: "confirm" };
  if (input.sameUser) return { ok: false, reason: "self" };
  if (!input.targetActive) return { ok: false, reason: "unavailable" };
  return { ok: true };
}

/**
 * Durante la visualizzazione il file sanitario segue il permesso dell'amministratore
 * autenticato, non quello dell'account aperto.
 */
export function canReadMedicalFile(input: {
  viewing: boolean;
  viewerAllowed: boolean;
  subjectAllowed: boolean;
}) {
  if (input.viewing) return input.viewerAllowed;
  return input.subjectAllowed;
}

export function personLabel(input: {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const profile = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  if (profile) return profile;
  const name = input.name?.trim();
  if (name) return name;
  return input.email;
}

export function sessionDurationSeconds(startedAt: Date, endedAt: Date | null, now = new Date()) {
  const end = endedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 1000));
}

export function highestStaffRole(roles: readonly Role[]) {
  if (roles.includes("SUPER_ADMIN")) return "SUPER_ADMIN";
  if (roles.includes("ORGANIZATION_ADMIN")) return "ORGANIZATION_ADMIN";
  if (roles.includes("MEDICAL_REVIEWER")) return "MEDICAL_REVIEWER";
  return roles[0] ?? null;
}
