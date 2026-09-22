import { isInactiveRegistrationStatus } from "@/features/registrations/domain/requirements";
import { ERROR_CODES, type ErrorCode } from "@/shared/errors";

export type RegistrationActivity = {
  teamId: string;
  editionId: string;
  status: string;
};

export type IdentityHolderLifecycle = "ACTIVE" | "DELETED" | "ANONYMIZED";

export type IdentityHolder = {
  userId: string;
  lifecycleStatus?: IdentityHolderLifecycle;
  registrations: RegistrationActivity[];
};

export type RegistrationLifecycle =
  | "none"
  | "invited"
  | "in_progress"
  | "completed"
  | "withdrawn"
  | "removed"
  | "blocked";

export type IdentityClassification =
  | { kind: "new_player" }
  | { kind: "own_identity"; lifecycle: RegistrationLifecycle }
  | {
      kind: "foreign_identity";
      primary: ErrorCode;
      codes: ErrorCode[];
      needsUserAction: true;
      needsOrgAction: boolean;
    };

export function isActiveRegistrationStatus(status: string) {
  return !isInactiveRegistrationStatus(status);
}

export function classifyRegistrationLifecycle(
  status: string | null | undefined,
  blocked = false,
): RegistrationLifecycle {
  if (blocked) return "blocked";
  if (!status) return "none";
  if (status === "WITHDRAWN") return "withdrawn";
  if (status === "REMOVED") return "removed";
  if (status === "INVITED") return "invited";
  if (status === "APPROVED") return "completed";
  if (isActiveRegistrationStatus(status)) return "in_progress";
  return "in_progress";
}

function uniqueCodes(codes: ErrorCode[]): ErrorCode[] {
  return [...new Set(codes)];
}

export function holderFromProfile(row: {
  userId: string;
  registrations: RegistrationActivity[];
  lifecycleStatus?: string | null;
} | null | undefined): IdentityHolder | null {
  if (!row) return null;
  const status = row.lifecycleStatus;
  const lifecycleStatus: IdentityHolderLifecycle =
    status === "DELETED" || status === "ANONYMIZED" ? status : "ACTIVE";
  return {
    userId: row.userId,
    lifecycleStatus,
    registrations: row.registrations,
  };
}

function holderAccountClosed(holder: IdentityHolder) {
  return holder.lifecycleStatus === "DELETED" || holder.lifecycleStatus === "ANONYMIZED";
}

export function classifyFiscalIdentity(input: {
  currentUserId: string;
  currentTeamId: string;
  currentEditionId: string;
  currentRegistrationStatus: string;
  holder: IdentityHolder | null;
}): IdentityClassification {
  const { holder, currentUserId, currentTeamId, currentEditionId, currentRegistrationStatus } = input;

  if (!holder) {
    return { kind: "new_player" };
  }

  if (holder.userId === currentUserId) {
    const current = holder.registrations.find((registration) => registration.editionId === currentEditionId);
    return {
      kind: "own_identity",
      lifecycle: classifyRegistrationLifecycle(current?.status ?? currentRegistrationStatus),
    };
  }

  const active = holder.registrations.filter((registration) => isActiveRegistrationStatus(registration.status));
  const onThisTeam = active.some((registration) => registration.teamId === currentTeamId);
  const onThisEdition = active.some((registration) => registration.editionId === currentEditionId);
  const accountClosed = holderAccountClosed(holder);

  const codes: ErrorCode[] = [
    ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED,
    ERROR_CODES.IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL,
    ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
  ];

  if (onThisTeam) {
    codes.push(ERROR_CODES.IDENTITY_PLAYER_ALREADY_ON_TEAM, ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION);
  } else if (onThisEdition) {
    codes.push(ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION);
  }

  const needsOrgAction = onThisTeam || onThisEdition || accountClosed;
  codes.push(needsOrgAction ? ERROR_CODES.IDENTITY_CONFLICT_NEEDS_ORG : ERROR_CODES.IDENTITY_CONFLICT_NEEDS_USER);

  const primary = onThisTeam
    ? ERROR_CODES.IDENTITY_PLAYER_ALREADY_ON_TEAM
    : onThisEdition
      ? ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION
      : ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT;

  return {
    kind: "foreign_identity",
    primary,
    codes: uniqueCodes(codes),
    needsUserAction: true,
    needsOrgAction,
  };
}

/** Unique CF violato ma il titolare non è un account riusabile (chiuso/anonimo o race). */
export function classifyOccupiedFiscalCode(input: {
  currentUserId: string;
  currentTeamId: string;
  currentEditionId: string;
  currentRegistrationStatus: string;
  holder: IdentityHolder | null;
}): Extract<IdentityClassification, { kind: "foreign_identity" }> {
  const classified = classifyFiscalIdentity(input);
  if (classified.kind === "foreign_identity") return classified;
  const forced = classifyFiscalIdentity({
    ...input,
    holder: {
      userId: input.holder?.userId && input.holder.userId !== input.currentUserId ? input.holder.userId : "unknown",
      lifecycleStatus: "DELETED",
      registrations: input.holder?.registrations ?? [],
    },
  });
  if (forced.kind !== "foreign_identity") {
    return {
      kind: "foreign_identity",
      primary: ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
      codes: [
        ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED,
        ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
        ERROR_CODES.IDENTITY_CONFLICT_NEEDS_ORG,
      ],
      needsUserAction: true,
      needsOrgAction: true,
    };
  }
  return forced;
}

export function publicIdentityErrorCode(): ErrorCode {
  return ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED;
}

export function shouldPersistIdentityBlock(input: {
  classification: IdentityClassification;
  currentFiscalCode: string | null;
}): boolean {
  return input.classification.kind === "foreign_identity" && !input.currentFiscalCode?.trim();
}

export type StoredIdentityConflict = {
  code: ErrorCode;
  detectedAt: string;
};

function asRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>) };
  }
  return {};
}

export function readIdentityConflict(metadata: unknown): StoredIdentityConflict | null {
  const record = asRecord(metadata).identityConflict;
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const conflict = record as { code?: unknown; detectedAt?: unknown };
  if (typeof conflict.code !== "string" || typeof conflict.detectedAt !== "string") return null;
  return { code: conflict.code as ErrorCode, detectedAt: conflict.detectedAt };
}

export function writeIdentityConflict(metadata: unknown, conflict: StoredIdentityConflict): Record<string, unknown> {
  return { ...asRecord(metadata), identityConflict: conflict };
}

export function clearIdentityConflict(metadata: unknown): Record<string, unknown> {
  const next = asRecord(metadata);
  delete next.identityConflict;
  return next;
}

export function workspaceIdentityBlock(input: {
  fiscalCode: string | null;
  metadata: unknown;
  registrationStatus?: string;
}): StoredIdentityConflict | null {
  if (input.registrationStatus === "WITHDRAWN" || input.registrationStatus === "REMOVED") return null;
  if (input.fiscalCode?.trim()) return null;
  return readIdentityConflict(input.metadata);
}
