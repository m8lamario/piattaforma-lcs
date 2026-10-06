-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('USER', 'GUARDIAN_LINK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GuardianAuthorizationStatus" AS ENUM ('PENDING', 'OPENED', 'AUTHORIZED', 'REFUSED', 'EXPIRED', 'SUPERSEDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "GuardianAuthorizationType" AS ENUM ('ENROLLMENT', 'PUBLICATION');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MEDICAL_REVIEWER';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "blobPurgedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN "clauseText" TEXT,
ADD COLUMN "actorKind" "ActorKind" NOT NULL DEFAULT 'USER',
ADD COLUMN "actorRole" TEXT;

-- AlterTable
ALTER TABLE "ConsentChoice" ADD COLUMN "clauseText" TEXT,
ADD COLUMN "actorKind" "ActorKind" NOT NULL DEFAULT 'USER',
ADD COLUMN "actorRole" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorKind" "ActorKind" NOT NULL DEFAULT 'USER',
ADD COLUMN "actorRole" TEXT,
ADD COLUMN "guardianId" TEXT,
ADD COLUMN "authorizationId" TEXT,
ADD COLUMN "legalDocumentVersionId" TEXT;

-- CreateTable
CREATE TABLE "GuardianAuthorization" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "tokenId" TEXT,
    "status" "GuardianAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "authorizationType" "GuardianAuthorizationType" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "legalDocumentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianAuthorizationDecision" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "clauseText" TEXT,
    "legalDocumentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianAuthorizationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "authorizationId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianAuthorization_tokenId_key" ON "GuardianAuthorization"("tokenId");

-- CreateIndex
CREATE INDEX "GuardianAuthorization_registrationId_authorizationType_status_idx" ON "GuardianAuthorization"("registrationId", "authorizationType", "status");

-- CreateIndex
CREATE INDEX "GuardianAuthorization_guardianId_status_idx" ON "GuardianAuthorization"("guardianId", "status");

-- CreateIndex
CREATE INDEX "GuardianAuthorization_playerProfileId_idx" ON "GuardianAuthorization"("playerProfileId");

-- CreateIndex
CREATE INDEX "GuardianAuthorizationDecision_authorizationId_createdAt_idx" ON "GuardianAuthorizationDecision"("authorizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianLinkToken_tokenHash_key" ON "GuardianLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "GuardianLinkToken_authorizationId_purpose_idx" ON "GuardianLinkToken"("authorizationId", "purpose");

-- CreateIndex
CREATE INDEX "GuardianLinkToken_registrationId_purpose_idx" ON "GuardianLinkToken"("registrationId", "purpose");

-- CreateIndex
CREATE INDEX "AuditLog_guardianId_idx" ON "AuditLog"("guardianId");

-- CreateIndex
CREATE INDEX "AuditLog_authorizationId_idx" ON "AuditLog"("authorizationId");

-- AddForeignKey
ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_legalDocumentVersionId_fkey" FOREIGN KEY ("legalDocumentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorizationDecision" ADD CONSTRAINT "GuardianAuthorizationDecision_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "GuardianAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorizationDecision" ADD CONSTRAINT "GuardianAuthorizationDecision_legalDocumentVersionId_fkey" FOREIGN KEY ("legalDocumentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLinkToken" ADD CONSTRAINT "GuardianLinkToken_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLinkToken" ADD CONSTRAINT "GuardianLinkToken_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLinkToken" ADD CONSTRAINT "GuardianLinkToken_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLinkToken" ADD CONSTRAINT "GuardianLinkToken_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "GuardianAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianAuthorization" ADD CONSTRAINT "GuardianAuthorization_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GuardianLinkToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "GuardianAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_legalDocumentVersionId_fkey" FOREIGN KEY ("legalDocumentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
