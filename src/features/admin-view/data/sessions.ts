import type { Prisma } from "@generated/client";
import { ADMIN_VIEW_TTL_SECONDS } from "@/features/admin-view/domain/constants";
import { viewCookieExpiry } from "@/features/admin-view/domain/cookie";
import { closeAdminView } from "@/shared/lib/readOnlyGuard";
import { unguardedPrisma } from "@/shared/lib/prisma";

type Trace = { ipAddress: string | null; userAgent: string | null };

export async function supersedeOpenViews(input: { adminId: string; adminRole: string | null }) {
  const open = await unguardedPrisma.adminViewSession.findMany({
    where: { adminUserId: input.adminId, endedAt: null },
    select: { id: true, startedAt: true },
  });
  for (const row of open) {
    await closeAdminView({
      sessionId: row.id,
      adminId: input.adminId,
      adminRole: input.adminRole,
      reason: "SUPERSEDED",
      startedAt: row.startedAt,
    });
  }
}

export async function openAdminView(input: {
  adminId: string;
  adminRole: string | null;
  targetUserId: string;
  trace: Trace;
}) {
  const startedAt = new Date();
  const expiresAt = viewCookieExpiry(startedAt);
  const session = await unguardedPrisma.adminViewSession.create({
    data: {
      adminUserId: input.adminId,
      targetUserId: input.targetUserId,
      mode: "READ_ONLY",
      startedAt,
      expiresAt,
    },
  });
  await unguardedPrisma.auditLog.create({
    data: {
      actorUserId: input.adminId,
      actorKind: "USER",
      actorRole: input.adminRole,
      action: "VIEW_SESSION_START",
      entityType: "AdminViewSession",
      entityId: session.id,
      metadata: {
        targetUserId: input.targetUserId,
        mode: "READ_ONLY",
        ttlSeconds: ADMIN_VIEW_TTL_SECONDS,
      },
      ipAddress: input.trace.ipAddress,
      userAgent: input.trace.userAgent,
    },
  });
  return session;
}

const sessionInclude = {
  admin: { select: { id: true, email: true, name: true } },
  target: {
    select: {
      id: true,
      email: true,
      name: true,
      playerProfile: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.AdminViewSessionInclude;

export async function closeExpiredViews() {
  const stale = await unguardedPrisma.adminViewSession.findMany({
    where: { endedAt: null, expiresAt: { lt: new Date() } },
    select: { id: true, adminUserId: true, startedAt: true },
  });
  for (const row of stale) {
    await closeAdminView({
      sessionId: row.id,
      adminId: row.adminUserId,
      adminRole: null,
      reason: "EXPIRED",
      startedAt: row.startedAt,
    });
  }
}

export async function listAdminViews(query?: string) {
  await closeExpiredViews();
  const q = query?.trim();
  return unguardedPrisma.adminViewSession.findMany({
    where: q
      ? {
          OR: [
            { admin: { email: { contains: q, mode: "insensitive" } } },
            { target: { email: { contains: q, mode: "insensitive" } } },
            { target: { name: { contains: q, mode: "insensitive" } } },
            { target: { playerProfile: { firstName: { contains: q, mode: "insensitive" } } } },
            { target: { playerProfile: { lastName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    include: sessionInclude,
    orderBy: { startedAt: "desc" },
    take: 100,
  });
}

export async function getAdminView(id: string) {
  await closeExpiredViews();
  const [session, events] = await Promise.all([
    unguardedPrisma.adminViewSession.findUnique({ where: { id }, include: sessionInclude }),
    unguardedPrisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "AdminViewSession", entityId: id },
          { metadata: { path: ["viewSessionId"], equals: id } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        entityType: true,
        entityId: true,
      },
    }),
  ]);
  return { session, events };
}

export async function blockedCounts(sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, number>();
  const rows = await unguardedPrisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      action: "VIEW_WRITE_BLOCKED",
      entityType: "AdminViewSession",
      entityId: { in: sessionIds },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.entityId, row._count._all]));
}
