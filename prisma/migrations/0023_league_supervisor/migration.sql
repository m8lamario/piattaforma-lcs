-- CreateEnum
CREATE TYPE "LeagueSupervisorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "LeagueSupervisor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "status" "LeagueSupervisorStatus" NOT NULL DEFAULT 'ACTIVE',
    "activationTokenHash" TEXT,
    "activationExpiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSupervisor_userId_key" ON "LeagueSupervisor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSupervisor_activationTokenHash_key" ON "LeagueSupervisor"("activationTokenHash");

-- CreateIndex
CREATE INDEX "LeagueSupervisor_editionId_idx" ON "LeagueSupervisor"("editionId");

-- CreateIndex
CREATE INDEX "LeagueSupervisor_status_idx" ON "LeagueSupervisor"("status");

-- CreateIndex
CREATE INDEX "LeagueSupervisor_createdByUserId_idx" ON "LeagueSupervisor"("createdByUserId");

-- AddForeignKey
ALTER TABLE "LeagueSupervisor" ADD CONSTRAINT "LeagueSupervisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSupervisor" ADD CONSTRAINT "LeagueSupervisor_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSupervisor" ADD CONSTRAINT "LeagueSupervisor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lo scope edizione non sta su UserRole.
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_league_supervisor_scope_check"
CHECK (
  "role" <> 'LEAGUE_SUPERVISOR'
  OR ("teamId" IS NULL AND "competitionId" IS NULL)
);
