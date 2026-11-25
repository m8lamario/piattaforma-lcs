-- CreateIndex
CREATE INDEX "Registration_editionId_category_status_idx" ON "Registration"("editionId", "category", "status");

-- CreateIndex
CREATE INDEX "Document_status_uploadedAt_idx" ON "Document"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "EmailMessage_sourceEntityId_purpose_idx" ON "EmailMessage"("sourceEntityId", "purpose");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_editionId_idx" ON "SchoolRegistrationRequest"("editionId");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_schoolId_idx" ON "SchoolRegistrationRequest"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_teamId_idx" ON "SchoolRegistrationRequest"("teamId");

-- CreateIndex
CREATE INDEX "SchoolRegistrationRequest_userId_idx" ON "SchoolRegistrationRequest"("userId");

-- CreateIndex
CREATE INDEX "Payment_payerUserId_idx" ON "Payment"("payerUserId");
