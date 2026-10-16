-- Dati di fatturazione raccolti da Stripe Checkout. Non sono la residenza.
-- Nessun dato carta. I campi restano nulli finché il webhook non conferma il pagamento.

ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

ALTER TABLE "Payment" ADD COLUMN "billingName" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingLine1" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingLine2" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingPostalCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingState" TEXT;
ALTER TABLE "Payment" ADD COLUMN "billingCountry" TEXT;
