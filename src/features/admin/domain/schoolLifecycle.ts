import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD, LIFECYCLE_CODES, confirmWordMatches } from "@/features/admin/domain/lifecycle";
import { ERROR_CODES, type ErrorCode } from "@/shared/errors/codes";

export type SchoolDeleteBlocker = "payments" | "bank_transfers" | "documents";

export type SchoolUserRef = {
  id: string;
  lifecycleStatus: "ACTIVE" | "DELETED" | "ANONYMIZED";
  isActor: boolean;
  isLastSuperAdmin: boolean;
  platformRole: boolean;
  otherSchool: boolean;
};

export type SchoolLifecycleSnapshot = {
  school: { id: string; name: string; anonymized: boolean } | null;
  confirm: string;
  actorUserId: string;
  users: SchoolUserRef[];
  teamIds: string[];
  registrationIds: string[];
  requestIds: string[];
  playerCount: number;
  staffCount: number;
  representativeCount: number;
  documentIds: string[];
  paymentCount: number;
  bankTransferCount: number;
};

export type SchoolAnonymizePlan = {
  operation: "anonymize";
  schoolId: string;
  exclusiveUserIds: string[];
  detachUserIds: string[];
  teamIds: string[];
  registrationIds: string[];
  requestIds: string[];
  documentIds: string[];
};

export type SchoolDeletePlan = {
  operation: "delete";
  schoolId: string;
  exclusiveUserIds: string[];
  teamIds: string[];
  registrationIds: string[];
  requestIds: string[];
};

export type SchoolLifecycleResult<T> = { ok: true; plan: T } | { ok: false; code: ErrorCode };

const PLATFORM_SKIP = (user: SchoolUserRef) => user.platformRole || user.otherSchool || user.isActor || user.isLastSuperAdmin;

export function schoolDeleteBlockers(input: Pick<SchoolLifecycleSnapshot, "paymentCount" | "bankTransferCount" | "documentIds">): SchoolDeleteBlocker[] {
  const blockers: SchoolDeleteBlocker[] = [];
  if (input.paymentCount > 0) blockers.push("payments");
  if (input.bankTransferCount > 0) blockers.push("bank_transfers");
  if (input.documentIds.length > 0) blockers.push("documents");
  return blockers;
}

function exclusiveAnonymizeIds(users: SchoolUserRef[]) {
  return users.filter((user) => !PLATFORM_SKIP(user) && user.lifecycleStatus !== "ANONYMIZED").map((user) => user.id);
}

function exclusiveDeleteIds(users: SchoolUserRef[]) {
  return users.filter((user) => !PLATFORM_SKIP(user) && user.lifecycleStatus === "ACTIVE").map((user) => user.id);
}

function detachIds(users: SchoolUserRef[]) {
  return users.filter((user) => user.platformRole || user.otherSchool).map((user) => user.id);
}

function blockedByActorOrSuper(users: SchoolUserRef[], mode: "delete" | "anonymize"): SchoolLifecycleResult<never> | null {
  if (users.some((user) => user.isActor)) {
    return {
      ok: false,
      code: mode === "delete" ? LIFECYCLE_CODES.LIFECYCLE_CANNOT_DELETE_SELF : LIFECYCLE_CODES.LIFECYCLE_CANNOT_ANONYMIZE_SELF,
    };
  }
  if (users.some((user) => user.isLastSuperAdmin)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_LAST_SUPER_ADMIN };
  }
  return null;
}

export function decideAnonymizeSchool(input: SchoolLifecycleSnapshot): SchoolLifecycleResult<SchoolAnonymizePlan> {
  if (!input.school) return { ok: false, code: ERROR_CODES.SCHOOL_NOT_FOUND };
  if (input.school.anonymized) return { ok: false, code: ERROR_CODES.SCHOOL_ALREADY_ANONYMIZED };
  const blocked = blockedByActorOrSuper(input.users, "anonymize");
  if (blocked) return blocked;
  if (!confirmWordMatches(ANONYMIZE_CONFIRM_WORD, input.confirm)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH };
  }
  return {
    ok: true,
    plan: {
      operation: "anonymize",
      schoolId: input.school.id,
      exclusiveUserIds: exclusiveAnonymizeIds(input.users),
      detachUserIds: detachIds(input.users),
      teamIds: input.teamIds,
      registrationIds: input.registrationIds,
      requestIds: input.requestIds,
      documentIds: input.documentIds,
    },
  };
}

export function decideDeleteSchool(input: SchoolLifecycleSnapshot): SchoolLifecycleResult<SchoolDeletePlan> {
  if (!input.school) return { ok: false, code: ERROR_CODES.SCHOOL_NOT_FOUND };
  const blocked = blockedByActorOrSuper(input.users, "delete");
  if (blocked) return blocked;
  if (schoolDeleteBlockers(input).length > 0) return { ok: false, code: ERROR_CODES.SCHOOL_DELETE_BLOCKED };
  if (!confirmWordMatches(DELETE_CONFIRM_WORD, input.confirm)) {
    return { ok: false, code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH };
  }
  return {
    ok: true,
    plan: {
      operation: "delete",
      schoolId: input.school.id,
      exclusiveUserIds: exclusiveDeleteIds(input.users),
      teamIds: input.teamIds,
      registrationIds: input.registrationIds,
      requestIds: input.requestIds,
    },
  };
}

export function schoolIsAnonymized(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && "anonymized" in metadata && (metadata as { anonymized?: unknown }).anonymized === true);
}
