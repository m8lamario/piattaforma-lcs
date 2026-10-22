-- Quote personalizzate della squadra, in centesimi. NULL = usa la quota predefinita dell'edizione.
-- Non modifica Payment.amount: lo storico resta l'importo addebitato.

ALTER TABLE "Team" ADD COLUMN "playerFeeCents" INTEGER;
ALTER TABLE "Team" ADD COLUMN "staffFeeCents" INTEGER;
ALTER TABLE "Team" ADD COLUMN "teamFeeCents" INTEGER;

ALTER TABLE "Team" ADD CONSTRAINT "Team_playerFeeCents_positive" CHECK ("playerFeeCents" IS NULL OR "playerFeeCents" > 0);
ALTER TABLE "Team" ADD CONSTRAINT "Team_staffFeeCents_positive" CHECK ("staffFeeCents" IS NULL OR "staffFeeCents" > 0);
ALTER TABLE "Team" ADD CONSTRAINT "Team_teamFeeCents_positive" CHECK ("teamFeeCents" IS NULL OR "teamFeeCents" > 0);
