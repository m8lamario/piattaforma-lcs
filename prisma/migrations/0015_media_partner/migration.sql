-- CreateEnum
CREATE TYPE "MediaPartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MEDIA_PARTNER';

-- CreateTable
CREATE TABLE "MediaPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MediaPartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPartnerAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaPartnerId" TEXT NOT NULL,
    "status" "MediaPartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "activationTokenHash" TEXT,
    "activationExpiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPartnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPartnerCompetition" (
    "id" TEXT NOT NULL,
    "mediaPartnerId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPartnerCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaPartner_status_idx" ON "MediaPartner"("status");

-- CreateIndex
CREATE INDEX "MediaPartner_name_idx" ON "MediaPartner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPartnerAccount_userId_key" ON "MediaPartnerAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPartnerAccount_activationTokenHash_key" ON "MediaPartnerAccount"("activationTokenHash");

-- CreateIndex
CREATE INDEX "MediaPartnerAccount_mediaPartnerId_idx" ON "MediaPartnerAccount"("mediaPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPartnerCompetition_mediaPartnerId_competitionId_key" ON "MediaPartnerCompetition"("mediaPartnerId", "competitionId");

-- CreateIndex
CREATE INDEX "MediaPartnerCompetition_competitionId_idx" ON "MediaPartnerCompetition"("competitionId");

-- AddForeignKey
ALTER TABLE "MediaPartnerAccount" ADD CONSTRAINT "MediaPartnerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPartnerAccount" ADD CONSTRAINT "MediaPartnerAccount_mediaPartnerId_fkey" FOREIGN KEY ("mediaPartnerId") REFERENCES "MediaPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPartnerCompetition" ADD CONSTRAINT "MediaPartnerCompetition_mediaPartnerId_fkey" FOREIGN KEY ("mediaPartnerId") REFERENCES "MediaPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPartnerCompetition" ADD CONSTRAINT "MediaPartnerCompetition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
