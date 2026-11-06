-- Sessione di visualizzazione amministrativa in sola lettura.
-- Separata da Auth.js. Lo storico append-only resta su AuditLog.

CREATE TYPE "AdminViewMode" AS ENUM ('READ_ONLY');

CREATE TYPE "AdminViewEndReason" AS ENUM ('MANUAL', 'EXPIRED', 'SUPERSEDED', 'REVOKED');

CREATE TABLE "AdminViewSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "mode" "AdminViewMode" NOT NULL DEFAULT 'READ_ONLY',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endReason" "AdminViewEndReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminViewSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminViewSession_adminUserId_endedAt_idx" ON "AdminViewSession"("adminUserId", "endedAt");

CREATE INDEX "AdminViewSession_targetUserId_startedAt_idx" ON "AdminViewSession"("targetUserId", "startedAt");

CREATE INDEX "AdminViewSession_startedAt_idx" ON "AdminViewSession"("startedAt");

ALTER TABLE "AdminViewSession" ADD CONSTRAINT "AdminViewSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminViewSession" ADD CONSTRAINT "AdminViewSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
