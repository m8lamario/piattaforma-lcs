import { cache } from "react";
import type { PrismaClient } from "@generated/client";
import { ADMIN_VIEW_COOKIE } from "@/features/admin-view/domain/constants";
import { openViewCookie, viewCookieSecret } from "@/features/admin-view/domain/cookie";
import { highestStaffRole, personLabel } from "@/features/admin-view/domain/policy";
import { isBlockedWrite } from "@/features/admin-view/domain/writes";
import { authorize } from "@/shared/authz/authorize";
import type { Role } from "@/shared/authz/types";
import { fail, type ActionFailure } from "@/shared/errors";
import { ReadOnlyViewError } from "@/shared/lib/readOnlyError";

export type ActiveAdminView = {
  sessionId: string;
  adminId: string;
  targetUserId: string;
  mode: "READ_ONLY";
  startedAt: Date;
  expiresAt: Date;
  targetName: string;
  targetEmail: string;
  adminRole: string | null;
};

type EndReason = "MANUAL" | "EXPIRED" | "SUPERSEDED" | "REVOKED";

let base: PrismaClient | null = null;
const recentBlocks = new Map<string, number>();

export function registerReadOnlyGuard(client: PrismaClient) {
  base = client;
}

function remember(key: string) {
  const now = Date.now();
  const previous = recentBlocks.get(key);
  if (previous && now - previous < 2000) return false;
  recentBlocks.set(key, now);
  if (recentBlocks.size > 400) {
    const cutoff = now - 2000;
    for (const [entry, at] of recentBlocks) {
      if (at < cutoff) recentBlocks.delete(entry);
    }
  }
  return true;
}

async function trace() {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    return {
      ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent"),
    };
  } catch {
    return { ipAddress: null, userAgent: null as string | null };
  }
}

async function writeViewAudit(input: {
  adminId: string;
  adminRole: string | null;
  action: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  if (!base) return;
  const client = await trace();
  await base.auditLog.create({
    data: {
      actorUserId: input.adminId,
      actorKind: "USER",
      actorRole: input.adminRole,
      action: input.action,
      entityType: "AdminViewSession",
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    },
  });
}

export async function closeAdminView(input: {
  sessionId: string;
  adminId: string;
  adminRole: string | null;
  reason: EndReason;
  startedAt: Date;
}) {
  if (!base) return false;
  const endedAt = new Date();
  const updated = await base.adminViewSession.updateMany({
    where: { id: input.sessionId, adminUserId: input.adminId, endedAt: null },
    data: { endedAt, endReason: input.reason },
  });
  if (updated.count === 0) return false;
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - input.startedAt.getTime()) / 1000));
  await writeViewAudit({
    adminId: input.adminId,
    adminRole: input.adminRole,
    action: "VIEW_SESSION_END",
    entityId: input.sessionId,
    metadata: { reason: input.reason, durationSeconds },
  });
  return true;
}

async function readCookie() {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return jar.get(ADMIN_VIEW_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function authenticatedUserId() {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export const loadActiveAdminView = cache(async (): Promise<ActiveAdminView | null> => {
  if (!base) return null;
  const token = await readCookie();
  if (!token) return null;
  const opened = openViewCookie(token, viewCookieSecret());
  if (!opened) return null;

  const adminId = await authenticatedUserId();
  if (!adminId || adminId !== opened.payload.adminId) return null;

  const row = await base.adminViewSession.findUnique({
    where: { id: opened.payload.sessionId },
    include: {
      admin: { select: { id: true, lifecycleStatus: true, roles: { select: { role: true } } } },
      target: {
        select: {
          id: true,
          email: true,
          name: true,
          lifecycleStatus: true,
          playerProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!row || row.mode !== "READ_ONLY") return null;
  if (row.adminUserId !== adminId || row.targetUserId !== opened.payload.targetUserId) return null;
  if (row.endedAt) return null;

  const adminRole = highestStaffRole(row.admin.roles.map((role) => role.role as Role));
  const actor = {
    userId: row.admin.id,
    roles: row.admin.roles.map((role) => ({ role: role.role as Role })),
    membershipTeamIds: [] as string[],
  };
  const allowed = row.admin.lifecycleStatus === "ACTIVE" && authorize(actor, "user:view_as").allow;
  const targetActive = row.target.lifecycleStatus === "ACTIVE";
  const timedOut = opened.expired || row.expiresAt.getTime() <= Date.now();

  if (!allowed || !targetActive) {
    await closeAdminView({
      sessionId: row.id,
      adminId: row.adminUserId,
      adminRole,
      reason: "REVOKED",
      startedAt: row.startedAt,
    });
    return null;
  }
  if (timedOut) {
    await closeAdminView({
      sessionId: row.id,
      adminId: row.adminUserId,
      adminRole,
      reason: "EXPIRED",
      startedAt: row.startedAt,
    });
    return null;
  }

  return {
    sessionId: row.id,
    adminId: row.adminUserId,
    targetUserId: row.targetUserId,
    mode: "READ_ONLY",
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    targetEmail: row.target.email,
    targetName: personLabel({
      email: row.target.email,
      name: row.target.name,
      firstName: row.target.playerProfile?.firstName,
      lastName: row.target.playerProfile?.lastName,
    }),
    adminRole,
  };
});

export async function recordBlockedWrite(view: ActiveAdminView, model: string, operation: string) {
  if (!remember(`${view.sessionId}:${model}:${operation}`)) return;
  await writeViewAudit({
    adminId: view.adminId,
    adminRole: view.adminRole,
    action: "VIEW_WRITE_BLOCKED",
    entityId: view.sessionId,
    metadata: {
      model,
      operation,
      targetUserId: view.targetUserId,
      mode: "READ_ONLY",
    },
  });
}

export async function enforceReadOnly(model: string, operation: string) {
  const view = await loadActiveAdminView();
  if (!isBlockedWrite({ viewActive: Boolean(view), model, operation })) return;
  if (view) await recordBlockedWrite(view, model, operation);
  throw new ReadOnlyViewError();
}

export async function viewWriteDenial(): Promise<ActionFailure | null> {
  const view = await loadActiveAdminView();
  if (!view) return null;
  await recordBlockedWrite(view, "ServerAction", "mutation");
  return fail("VIEW_READ_ONLY");
}
