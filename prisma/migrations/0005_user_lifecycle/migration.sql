-- CreateEnum
CREATE TYPE "UserLifecycleStatus" AS ENUM ('ACTIVE', 'DELETED', 'ANONYMIZED');

-- AlterEnum
ALTER TYPE "RegistrationStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lifecycleStatus" "UserLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "anonymizedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_lifecycleStatus_idx" ON "User"("lifecycleStatus");
