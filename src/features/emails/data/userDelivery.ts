import { prisma } from "@/shared/lib/prisma";
import {
  PASSWORD_RESET_ATTEMPT_WINDOW_MS,
  projectPasswordResetAttempts,
  projectUserEmailDelivery,
  type UserEmailResendDecision,
  type UserEmailDeliveryState,
} from "@/features/emails/domain/delivery";
import { fail, type ActionFailure } from "@/shared/errors";

export type UserEmailOperation = {
  purpose: string;
  sourceEntityType: string;
  sourceEntityId: string;
  toAddress: string;
};

export type UserEmailDeliveryView = {
  state: UserEmailDeliveryState;
  lastStatus: string | null;
  lastQueuedAt: Date | null;
  totalSends: number;
  userResendCount: number;
  remainingResends: number;
  resendAvailableAt: Date | null;
  decision: UserEmailResendDecision;
  contactSupport: boolean;
};

function normalizeAddress(email: string) {
  return email.trim().toLowerCase();
}

export function userEmailDeliveryKey(op: {
  purpose: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  toAddress: string;
}) {
  return `${op.purpose}|${op.sourceEntityType ?? ""}|${op.sourceEntityId ?? ""}|${normalizeAddress(op.toAddress)}`;
}

export async function loadUserEmailDelivery(input: UserEmailOperation): Promise<UserEmailDeliveryView> {
  const toAddress = normalizeAddress(input.toAddress);
  const rows = await prisma.emailMessage.findMany({
    where: {
      purpose: input.purpose,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      toAddress,
    },
    orderBy: { queuedAt: "asc" },
    select: {
      status: true,
      queuedAt: true,
      idempotencyKey: true,
    },
  });
  return projectUserEmailDelivery({ rows });
}

export async function loadUserEmailDeliveries(ops: UserEmailOperation[]) {
  const views = new Map<string, UserEmailDeliveryView>();
  if (ops.length === 0) return views;
  const rows = await prisma.emailMessage.findMany({
    where: {
      OR: ops.map((op) => ({
        purpose: op.purpose,
        sourceEntityType: op.sourceEntityType,
        sourceEntityId: op.sourceEntityId,
        toAddress: normalizeAddress(op.toAddress),
      })),
    },
    orderBy: { queuedAt: "asc" },
    select: {
      purpose: true,
      sourceEntityType: true,
      sourceEntityId: true,
      toAddress: true,
      status: true,
      queuedAt: true,
      idempotencyKey: true,
    },
  });
  const grouped = new Map<string, Array<{ status: string; queuedAt: Date; idempotencyKey: string }>>();
  for (const row of rows) {
    const key = userEmailDeliveryKey(row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  for (const op of ops) {
    views.set(userEmailDeliveryKey(op), projectUserEmailDelivery({ rows: grouped.get(userEmailDeliveryKey(op)) ?? [] }));
  }
  return views;
}

export function deliveryViewFor(views: Map<string, UserEmailDeliveryView>, op: UserEmailOperation) {
  return views.get(userEmailDeliveryKey(op)) ?? projectUserEmailDelivery({ rows: [] });
}

export function failUserEmailResend(reason: Exclude<UserEmailResendDecision, { allow: true }>["reason"]): ActionFailure {
  switch (reason) {
    case "cooldown":
    case "sending":
      return fail("EMAIL_RESEND_COOLDOWN");
    case "undeliverable":
      return fail("EMAIL_UNDELIVERABLE");
    case "blocked":
    case "exhausted":
      return fail("EMAIL_RESEND_EXHAUSTED");
  }
}

export const USER_EMAIL_OPS = {
  verify: (userId: string, email: string): UserEmailOperation => ({
    purpose: "EMAIL_VERIFY",
    sourceEntityType: "User",
    sourceEntityId: userId,
    toAddress: email,
  }),
  passwordReset: (userId: string, email: string): UserEmailOperation => ({
    purpose: "password-reset",
    sourceEntityType: "User",
    sourceEntityId: userId,
    toAddress: email,
  }),
  guardianAuthorize: (authorizationId: string, email: string): UserEmailOperation => ({
    purpose: "GUARDIAN_AUTHORIZE",
    sourceEntityType: "GuardianAuthorization",
    sourceEntityId: authorizationId,
    toAddress: email,
  }),
  guardianPublication: (authorizationId: string, email: string): UserEmailOperation => ({
    purpose: "CONSENT_C1",
    sourceEntityType: "GuardianAuthorization",
    sourceEntityId: authorizationId,
    toAddress: email,
  }),
  schoolActivate: (requestId: string, email: string): UserEmailOperation => ({
    purpose: "SCHOOL_ACCESS_APPROVED",
    sourceEntityType: "SchoolRegistrationRequest",
    sourceEntityId: requestId,
    toAddress: email,
  }),
  playerInvite: (teamId: string, email: string): UserEmailOperation => ({
    purpose: "player-invite",
    sourceEntityType: "TeamPlayerInvite",
    sourceEntityId: teamId,
    toAddress: email,
  }),
} as const;

export async function loadPasswordResetAttemptView(email: string) {
  const key = passwordResetAttemptKey(email);
  const since = new Date(Date.now() - PASSWORD_RESET_ATTEMPT_WINDOW_MS);
  const attempts = await prisma.rateLimitHit.findMany({
    where: { key, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return projectPasswordResetAttempts({ attempts });
}

export function passwordResetAttemptKey(email: string) {
  return `password-reset-cap:${normalizeAddress(email)}`;
}

export async function recordPasswordResetAttempt(email: string) {
  await prisma.rateLimitHit.create({ data: { key: passwordResetAttemptKey(email) } });
}

export function serializeEmailDelivery(view: UserEmailDeliveryView) {
  return {
    state: view.state,
    remainingResends: view.remainingResends,
    resendAvailableAt: view.resendAvailableAt?.toISOString() ?? null,
    contactSupport: view.contactSupport,
  };
}
