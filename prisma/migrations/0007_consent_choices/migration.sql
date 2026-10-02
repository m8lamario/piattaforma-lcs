-- Granular consent boxes, C1 / marketing tokens, second guardian fields.
ALTER TABLE "Guardian" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE "Guardian" ADD COLUMN "soleResponsibility" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guardian" ADD COLUMN "emailCorrectionUsed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ConsentChoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "value" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "legalDocumentVersionId" TEXT,
    "guardianId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentChoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentToken" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "guardianId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentChoice_registrationId_code_createdAt_idx" ON "ConsentChoice"("registrationId", "code", "createdAt");
CREATE INDEX "ConsentChoice_userId_code_idx" ON "ConsentChoice"("userId", "code");
CREATE UNIQUE INDEX "ConsentToken_tokenHash_key" ON "ConsentToken"("tokenHash");
CREATE INDEX "ConsentToken_registrationId_purpose_idx" ON "ConsentToken"("registrationId", "purpose");

ALTER TABLE "ConsentChoice" ADD CONSTRAINT "ConsentChoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentChoice" ADD CONSTRAINT "ConsentChoice_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentChoice" ADD CONSTRAINT "ConsentChoice_legalDocumentVersionId_fkey" FOREIGN KEY ("legalDocumentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentChoice" ADD CONSTRAINT "ConsentChoice_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentToken" ADD CONSTRAINT "ConsentToken_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentToken" ADD CONSTRAINT "ConsentToken_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
