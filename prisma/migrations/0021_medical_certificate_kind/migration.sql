-- CreateEnum
CREATE TYPE "MedicalCertificateKind" AS ENUM ('COMPETITIVE', 'NON_COMPETITIVE');

-- CreateEnum
CREATE TYPE "MedicalNameMatch" AS ENUM ('MATCH', 'MISMATCH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MedicalStampPresence" AS ENUM ('PRESENT', 'ABSENT', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "DocumentStatus" ADD VALUE 'PREVALIDATED';

-- AlterTable
ALTER TABLE "Edition" ADD COLUMN "medicalCertificateKind" "MedicalCertificateKind" NOT NULL DEFAULT 'COMPETITIVE';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "requiredKindAtUpload" "MedicalCertificateKind" NOT NULL DEFAULT 'COMPETITIVE';

-- AlterTable
ALTER TABLE "DocumentReview" ADD COLUMN "requiredKindAtDecision" "MedicalCertificateKind";

-- CreateTable
CREATE TABLE "MedicalInspection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "inspectedKind" "MedicalCertificateKind" NOT NULL,
    "recognizedKind" "MedicalCertificateKind",
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "nameMatch" "MedicalNameMatch" NOT NULL,
    "stampPresence" "MedicalStampPresence" NOT NULL,
    "anomalies" TEXT[],
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalInspection_documentId_key" ON "MedicalInspection"("documentId");

-- CreateIndex
CREATE INDEX "MedicalInspection_inspectedKind_idx" ON "MedicalInspection"("inspectedKind");

-- AddForeignKey
ALTER TABLE "MedicalInspection" ADD CONSTRAINT "MedicalInspection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
