-- Bonifico di squadra confermato a mano. Nessuna sessione Stripe.
-- I Payment collegati sono lo snapshot di copertura. Un SUCCEEDED esistente non si aggiorna.

CREATE TABLE "TeamBankTransfer" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expectedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "reference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBankTransfer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeamBankTransfer" ADD CONSTRAINT "TeamBankTransfer_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "TeamBankTransfer" ADD CONSTRAINT "TeamBankTransfer_expected_positive" CHECK ("expectedAmount" > 0);

CREATE UNIQUE INDEX "TeamBankTransfer_teamId_reference_key" ON "TeamBankTransfer"("teamId", "reference");
CREATE INDEX "TeamBankTransfer_editionId_idx" ON "TeamBankTransfer"("editionId");
CREATE INDEX "TeamBankTransfer_recordedByUserId_idx" ON "TeamBankTransfer"("recordedByUserId");

ALTER TABLE "TeamBankTransfer" ADD CONSTRAINT "TeamBankTransfer_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamBankTransfer" ADD CONSTRAINT "TeamBankTransfer_teamId_editionId_fkey" FOREIGN KEY ("teamId", "editionId") REFERENCES "Team"("id", "editionId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TeamBankTransfer" ADD CONSTRAINT "TeamBankTransfer_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "bankTransferId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "recordedByUserId" TEXT;

CREATE INDEX "Payment_bankTransferId_idx" ON "Payment"("bankTransferId");
CREATE INDEX "Payment_recordedByUserId_idx" ON "Payment"("recordedByUserId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankTransferId_fkey" FOREIGN KEY ("bankTransferId") REFERENCES "TeamBankTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
