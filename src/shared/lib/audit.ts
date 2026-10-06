import { prisma } from "@/shared/lib/prisma";
import type { ActorKind } from "@generated/client";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  actorKind?: ActorKind | "USER" | "GUARDIAN_LINK" | "SYSTEM";
  actorRole?: string | null;
  guardianId?: string | null;
  authorizationId?: string | null;
  legalDocumentVersionId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorKind: (input.actorKind ?? "USER") as ActorKind,
      actorRole: input.actorRole ?? null,
      guardianId: input.guardianId ?? null,
      authorizationId: input.authorizationId ?? null,
      legalDocumentVersionId: input.legalDocumentVersionId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
