-- CreateEnum
CREATE TYPE "AiReviewState" AS ENUM ('NONE', 'FLAGGED', 'APPROVED', 'RETURNED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "aiReviewState" "AiReviewState" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Document" ADD COLUMN "aiFlagReason" TEXT;

-- AlterTable
ALTER TABLE "DocumentReview" ALTER COLUMN "reviewerId" DROP NOT NULL;
ALTER TABLE "DocumentReview" ADD COLUMN "actorKind" "ActorKind" NOT NULL DEFAULT 'USER';
ALTER TABLE "DocumentReview" ADD COLUMN "note" TEXT;
ALTER TABLE "DocumentReview" ADD COLUMN "issuedAt" DATE;
ALTER TABLE "DocumentReview" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "DocumentReview" ADD COLUMN "revokedById" TEXT;

-- CreateIndex
CREATE INDEX "Document_aiReviewState_status_uploadedAt_idx" ON "Document"("aiReviewState", "status", "uploadedAt");

-- CreateIndex
CREATE INDEX "DocumentReview_revokedById_idx" ON "DocumentReview"("revokedById");

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
