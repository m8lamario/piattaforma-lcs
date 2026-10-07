-- CreateEnum
CREATE TYPE "SchoolRequesterRole" AS ENUM ('INSTITUTE_REPRESENTATIVE', 'TEACHER', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SchoolRegistrationRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolNameKey" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "requesterRole" "SchoolRequesterRole" NOT NULL,
    "institutionalEmail" TEXT,
    "editionId" TEXT NOT NULL,
    "status" "SchoolRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "schoolId" TEXT,
    "teamId" TEXT,
    "userId" TEXT,
    "activationTokenHash" TEXT,
    "activationExpiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationRequest_activationTokenHash_key" ON "SchoolRegistrationRequest"("activationTokenHash");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_status_idx" ON "SchoolRegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_email_idx" ON "SchoolRegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_schoolNameKey_editionId_idx" ON "SchoolRegistrationRequest"("schoolNameKey", "editionId");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_reviewedByUserId_idx" ON "SchoolRegistrationRequest"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationRequest_pending_email_key"
ON "SchoolRegistrationRequest" ("email")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationRequest_pending_school_edition_key"
ON "SchoolRegistrationRequest" ("schoolNameKey", "editionId")
WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "SchoolRegistrationRequest" ADD CONSTRAINT "SchoolRegistrationRequest_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRegistrationRequest" ADD CONSTRAINT "SchoolRegistrationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRegistrationRequest" ADD CONSTRAINT "SchoolRegistrationRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRegistrationRequest" ADD CONSTRAINT "SchoolRegistrationRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRegistrationRequest" ADD CONSTRAINT "SchoolRegistrationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
