import { ERROR_CODES, userMessage, type ErrorCode } from "@/shared/errors";
import { it } from "@/shared/i18n/it";

/** Codici errore lifecycle — allineati a `src/shared/errors`. */
export const LIFECYCLE_CODES = {
  LIFECYCLE_REMOVE_FORBIDDEN: ERROR_CODES.LIFECYCLE_REMOVE_FORBIDDEN,
  LIFECYCLE_REMOVE_NOT_PLAYER: ERROR_CODES.LIFECYCLE_REMOVE_NOT_PLAYER,
  LIFECYCLE_NOT_ON_TEAM: ERROR_CODES.LIFECYCLE_NOT_ON_TEAM,
  LIFECYCLE_ACCOUNT_DELETED: ERROR_CODES.LIFECYCLE_ACCOUNT_DELETED,
  LIFECYCLE_ACCOUNT_ANONYMIZED: ERROR_CODES.LIFECYCLE_ACCOUNT_ANONYMIZED,
  LIFECYCLE_DELETE_FORBIDDEN: ERROR_CODES.LIFECYCLE_DELETE_FORBIDDEN,
  LIFECYCLE_ANONYMIZE_FORBIDDEN: ERROR_CODES.LIFECYCLE_ANONYMIZE_FORBIDDEN,
  LIFECYCLE_CANNOT_DELETE_SELF: ERROR_CODES.LIFECYCLE_CANNOT_DELETE_SELF,
  LIFECYCLE_CANNOT_ANONYMIZE_SELF: ERROR_CODES.LIFECYCLE_CANNOT_ANONYMIZE_SELF,
  LIFECYCLE_LAST_SUPER_ADMIN: ERROR_CODES.LIFECYCLE_LAST_SUPER_ADMIN,
  LIFECYCLE_CONFIRM_MISMATCH: ERROR_CODES.LIFECYCLE_CONFIRM_MISMATCH,
  LIFECYCLE_ALREADY_DELETED: ERROR_CODES.LIFECYCLE_ALREADY_DELETED,
  LIFECYCLE_ALREADY_ANONYMIZED: ERROR_CODES.LIFECYCLE_ALREADY_ANONYMIZED,
  LIFECYCLE_USER_NOT_FOUND: ERROR_CODES.LIFECYCLE_USER_NOT_FOUND,
  LIFECYCLE_TARGET_NOT_ACTIVE: ERROR_CODES.LIFECYCLE_TARGET_NOT_ACTIVE,
  LIFECYCLE_REGISTRATION_REMOVED: ERROR_CODES.LIFECYCLE_REGISTRATION_REMOVED,
} as const satisfies Record<string, ErrorCode>;

export type LifecycleCode = (typeof LIFECYCLE_CODES)[keyof typeof LIFECYCLE_CODES];

export const DELETE_CONFIRM_WORD = "ELIMINA";
export const ANONYMIZE_CONFIRM_WORD = "ANONIMIZZA";
export const REMOVE_FALLBACK_CONFIRM = "RIMUOVI";

export type UserLifecycleStatus = "ACTIVE" | "DELETED" | "ANONYMIZED";

export type RetainPolicy = {
  auditLogs: "retain";
  payments: "retain";
  documents: "retain";
  medicalBlobs: "retain";
  consents: "retain" | "redact_trace";
  profilePii: "retain" | "anonymize";
  notifications: "retain" | "delete";
  sessions: "retain" | "delete";
  memberships: "retain" | "delete_one" | "delete_all";
  userRow: "retain";
};

export type RemoveInput = {
  membership: {
    id: string;
    teamId: string;
    userId: string;
    role: "PLAYER" | "REPRESENTATIVE";
  } | null;
  lastName: string;
  confirm: string;
  registrationIds: string[];
  pendingInviteIds: string[];
  targetLifecycleStatus: UserLifecycleStatus;
};

export type RemovePlan = {
  operation: "remove";
  deleteMembershipId: string;
  userId: string;
  teamId: string;
  revokeInviteIds: string[];
  markRegistrationIds: string[];
  retain: RetainPolicy;
};

export type AccountInput = {
  user: {
    id: string;
    lifecycleStatus: UserLifecycleStatus;
    isSuperAdmin: boolean;
  } | null;
  actorUserId: string;
  confirm: string;
  activeSuperAdminCount: number;
  membershipIds: string[];
  pendingInviteIds: string[];
  pendingStaffInviteIds: string[];
  representativeTeamIds: string[];
  sessionIds: string[];
  accountIds: string[];
  notificationIds: string[];
  guardianIds: string[];
  documentIds: string[];
  consentIds: string[];
  paymentIds: string[];
  roleIds: string[];
  registrationIds: string[];
  auditLogCount: number;
};

export type DeletePlan = {
  operation: "delete";
  userId: string;
  tombstoneEmail: string;
  deleteMembershipIds: string[];
  revokeInviteIds: string[];
  revokeStaffInviteIds: string[];
  clearRepresentativeTeamIds: string[];
  deleteSessionIds: string[];
  deleteAccountIds: string[];
  deleteNotificationIds: string[];
  revokeRoleIds: string[];
  markRegistrationIds: string[];
  retain: RetainPolicy;
  auditLogCount: number;
};

export type AnonymizePlan = {
  operation: "anonymize";
  userId: string;
  tombstoneEmail: string;
  deleteMembershipIds: string[];
  revokeInviteIds: string[];
  revokeStaffInviteIds: string[];
  clearRepresentativeTeamIds: string[];
  deleteSessionIds: string[];
  deleteAccountIds: string[];
  deleteNotificationIds: string[];
  revokeRoleIds: string[];
  markRegistrationIds: string[];
  anonymizeGuardianIds: string[];
  redactDocumentIds: string[];
  redactConsentIds: string[];
  retainPaymentIds: string[];
  retain: RetainPolicy;
  auditLogCount: number;
};

export type LifecycleOk<T> = { ok: true; plan: T };
export type LifecycleErr = { ok: false; code: LifecycleCode };
export type LifecycleResult<T> = LifecycleOk<T> | LifecycleErr;

export function normalizeConfirm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function confirmWordMatches(expected: string, given: string) {
  return normalizeConfirm(expected).toLocaleUpperCase("it-IT") === normalizeConfirm(given).toLocaleUpperCase("it-IT");
}

export function confirmLastNameMatches(lastName: string, given: string) {
  return (
    normalizeConfirm(lastName).toLocaleLowerCase("it-IT") === normalizeConfirm(given).toLocaleLowerCase("it-IT")
  );
}

export function removeConfirmExpected(lastName: string) {
  const name = normalizeConfirm(lastName);
  return name || REMOVE_FALLBACK_CONFIRM;
}

export function tombstoneEmail(kind: "deleted" | "anon", userId: string) {
  return `${kind}.${userId}@invalid.local`;
}

export function lifecycleMessage(code: LifecycleCode): string {
  return userMessage(code);
}

export function lifecycleStatusLabel(status: string) {
  if (status === "DELETED") return it.lifecycleStatusDeleted;
  if (status === "ANONYMIZED") return it.lifecycleStatusAnonymized;
  return it.lifecycleStatusActive;
}

const REMOVE_RETAIN: RetainPolicy = {
  auditLogs: "retain",
  payments: "retain",
  documents: "retain",
  medicalBlobs: "retain",
  consents: "retain",
  profilePii: "retain",
  notifications: "retain",
  sessions: "retain",
  memberships: "delete_one",
  userRow: "retain",
};

const DELETE_RETAIN: RetainPolicy = {
  auditLogs: "retain",
  payments: "retain",
  documents: "retain",
  medicalBlobs: "retain",
  consents: "retain",
  profilePii: "retain",
  notifications: "delete",
  sessions: "delete",
  memberships: "delete_all",
  userRow: "retain",
};

const ANONYMIZE_RETAIN: RetainPolicy = {
  auditLogs: "retain",
  payments: "retain",
  documents: "retain",
  medicalBlobs: "retain",
  consents: "redact_trace",
  profilePii: "anonymize",
  notifications: "delete",
  sessions: "delete",
  memberships: "delete_all",
  userRow: "retain",
};

export function decideRemoveFromTeam(input: RemoveInput): LifecycleResult<RemovePlan> {
  if (!input.membership) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_NOT_ON_TEAM };
  }
  if (input.targetLifecycleStatus !== "ACTIVE") {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_TARGET_NOT_ACTIVE };
  }
  if (input.membership.role !== "PLAYER") {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_REMOVE_NOT_PLAYER };
  }
  const expected = removeConfirmExpected(input.lastName);
  const matches =
    expected === REMOVE_FALLBACK_CONFIRM
      ? confirmWordMatches(expected, input.confirm)
      : confirmLastNameMatches(expected, input.confirm);
  if (!matches) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH };
  }

  return {
    ok: true,
    plan: {
      operation: "remove",
      deleteMembershipId: input.membership.id,
      userId: input.membership.userId,
      teamId: input.membership.teamId,
      revokeInviteIds: input.pendingInviteIds,
      markRegistrationIds: input.registrationIds,
      retain: REMOVE_RETAIN,
    },
  };
}

function lastSuperAdminBlocked(input: AccountInput) {
  return Boolean(input.user?.isSuperAdmin) && input.activeSuperAdminCount <= 1;
}

export function decideDeleteAccount(input: AccountInput): LifecycleResult<DeletePlan> {
  if (!input.user) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND };
  }
  if (input.actorUserId === input.user.id) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CANNOT_DELETE_SELF };
  }
  if (input.user.lifecycleStatus === "ANONYMIZED") {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_ALREADY_ANONYMIZED };
  }
  if (input.user.lifecycleStatus === "DELETED") {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_ALREADY_DELETED };
  }
  if (lastSuperAdminBlocked(input)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_LAST_SUPER_ADMIN };
  }
  if (!confirmWordMatches(DELETE_CONFIRM_WORD, input.confirm)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH };
  }

  return {
    ok: true,
    plan: {
      operation: "delete",
      userId: input.user.id,
      tombstoneEmail: tombstoneEmail("deleted", input.user.id),
      deleteMembershipIds: input.membershipIds,
      revokeInviteIds: input.pendingInviteIds,
      revokeStaffInviteIds: input.pendingStaffInviteIds,
      clearRepresentativeTeamIds: input.representativeTeamIds,
      deleteSessionIds: input.sessionIds,
      deleteAccountIds: input.accountIds,
      deleteNotificationIds: input.notificationIds,
      revokeRoleIds: input.roleIds,
      markRegistrationIds: input.registrationIds,
      retain: DELETE_RETAIN,
      auditLogCount: input.auditLogCount,
    },
  };
}

export function decideAnonymizeAccount(input: AccountInput): LifecycleResult<AnonymizePlan> {
  if (!input.user) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_USER_NOT_FOUND };
  }
  if (input.actorUserId === input.user.id) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CANNOT_ANONYMIZE_SELF };
  }
  if (input.user.lifecycleStatus === "ANONYMIZED") {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_ALREADY_ANONYMIZED };
  }
  if (input.user.lifecycleStatus === "ACTIVE" && lastSuperAdminBlocked(input)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_LAST_SUPER_ADMIN };
  }
  if (!confirmWordMatches(ANONYMIZE_CONFIRM_WORD, input.confirm)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH };
  }

  return {
    ok: true,
    plan: {
      operation: "anonymize",
      userId: input.user.id,
      tombstoneEmail: tombstoneEmail("anon", input.user.id),
      deleteMembershipIds: input.membershipIds,
      revokeInviteIds: input.pendingInviteIds,
      revokeStaffInviteIds: input.pendingStaffInviteIds,
      clearRepresentativeTeamIds: input.representativeTeamIds,
      deleteSessionIds: input.sessionIds,
      deleteAccountIds: input.accountIds,
      deleteNotificationIds: input.notificationIds,
      revokeRoleIds: input.roleIds,
      markRegistrationIds: input.registrationIds,
      anonymizeGuardianIds: input.guardianIds,
      redactDocumentIds: input.documentIds,
      redactConsentIds: input.consentIds,
      retainPaymentIds: input.paymentIds,
      retain: ANONYMIZE_RETAIN,
      auditLogCount: input.auditLogCount,
    },
  };
}

export type LifecycleGraph = {
  user: {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
    lifecycleStatus: UserLifecycleStatus;
  };
  fiscalCode: string | null;
  memberships: { id: string; teamId: string; userId: string; role: string }[];
  registrations: { id: string; teamId: string; status: string }[];
  invites: { id: string; status: string }[];
  staffInvites: { id: string; status: string }[];
  documents: { id: string; originalFilename: string; storageKey: string }[];
  consents: { id: string; ipAddress: string | null; userAgent: string | null }[];
  payments: { id: string }[];
  notifications: { id: string }[];
  auditLogs: { id: string; action: string }[];
  sessions: { id: string }[];
  accounts: { id: string }[];
  roles: { id: string; role: string }[];
  guardians: { id: string; email: string; firstName: string; lastName: string; phone: string | null }[];
  representativeTeamIds: string[];
};

export function applyRemoveToGraph(graph: LifecycleGraph, plan: RemovePlan): LifecycleGraph {
  return {
    ...graph,
    memberships: graph.memberships.filter((row) => row.id !== plan.deleteMembershipId),
    invites: graph.invites.map((row) =>
      plan.revokeInviteIds.includes(row.id) ? { ...row, status: "REVOKED" } : row,
    ),
    registrations: graph.registrations.map((row) =>
      plan.markRegistrationIds.includes(row.id) ? { ...row, status: "REMOVED" } : row,
    ),
    auditLogs: [...graph.auditLogs, { id: `audit-remove-${plan.deleteMembershipId}`, action: "PLAYER_REMOVE" }],
  };
}

export function applyDeleteToGraph(graph: LifecycleGraph, plan: DeletePlan): LifecycleGraph {
  return {
    ...graph,
    user: {
      ...graph.user,
      email: plan.tombstoneEmail,
      name: null,
      passwordHash: null,
      lifecycleStatus: "DELETED",
    },
    memberships: graph.memberships.filter((row) => !plan.deleteMembershipIds.includes(row.id)),
    invites: graph.invites.map((row) =>
      plan.revokeInviteIds.includes(row.id) ? { ...row, status: "REVOKED" } : row,
    ),
    staffInvites: graph.staffInvites.map((row) =>
      plan.revokeStaffInviteIds.includes(row.id) ? { ...row, status: "REVOKED" } : row,
    ),
    sessions: [],
    accounts: [],
    notifications: [],
    roles: [],
    representativeTeamIds: [],
    documents: graph.documents,
    payments: graph.payments,
    consents: graph.consents,
    auditLogs: [...graph.auditLogs, { id: `audit-delete-${plan.userId}`, action: "ACCOUNT_DELETE" }],
    registrations: graph.registrations.map((row) =>
      plan.markRegistrationIds.includes(row.id) ? { ...row, status: "REMOVED" } : row,
    ),
    guardians: graph.guardians,
  };
}

export function applyAnonymizeToGraph(graph: LifecycleGraph, plan: AnonymizePlan): LifecycleGraph {
  return {
    ...graph,
    user: {
      ...graph.user,
      email: plan.tombstoneEmail,
      name: null,
      passwordHash: null,
      lifecycleStatus: "ANONYMIZED",
    },
    memberships: [],
    invites: graph.invites.map((row) =>
      plan.revokeInviteIds.includes(row.id) ? { ...row, status: "REVOKED" } : row,
    ),
    staffInvites: graph.staffInvites.map((row) =>
      plan.revokeStaffInviteIds.includes(row.id) ? { ...row, status: "REVOKED" } : row,
    ),
    sessions: [],
    accounts: [],
    notifications: [],
    roles: [],
    representativeTeamIds: [],
    documents: graph.documents.map((row) =>
      plan.redactDocumentIds.includes(row.id) ? { ...row, originalFilename: "redatto" } : row,
    ),
    consents: graph.consents.map((row) =>
      plan.redactConsentIds.includes(row.id) ? { ...row, ipAddress: null, userAgent: null } : row,
    ),
    payments: graph.payments,
    auditLogs: [...graph.auditLogs, { id: `audit-anon-${plan.userId}`, action: "ACCOUNT_ANONYMIZE" }],
    registrations: graph.registrations.map((row) =>
      plan.markRegistrationIds.includes(row.id) ? { ...row, status: "REMOVED" } : row,
    ),
    fiscalCode: null,
    guardians: graph.guardians.map((row) =>
      plan.anonymizeGuardianIds.includes(row.id)
        ? {
            ...row,
            firstName: "Anonimo",
            lastName: "Contatto",
            email: `anon.guardian.${row.id}@invalid.local`,
            phone: null,
          }
        : row,
    ),
  };
}

export function assertRetainedOperationalTraces(graph: LifecycleGraph) {
  return {
    auditRemains: graph.auditLogs.length > 0,
    paymentsRemain: graph.payments.length,
    documentsRemain: graph.documents.length,
    medicalKeysRemain: graph.documents.every((row) => Boolean(row.storageKey)),
    consentsRemain: graph.consents.length,
    userRowRemains: Boolean(graph.user.id),
  };
}
