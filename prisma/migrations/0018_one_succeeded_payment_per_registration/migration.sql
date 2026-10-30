-- Un solo Payment SUCCEEDED per registrazione.
-- PENDING, FAILED e REFUNDED restano ripetibili.
-- I pagamenti di squadra hanno registrationId nullo e non rientrano nell'indice.

CREATE UNIQUE INDEX "Payment_one_succeeded_registration"
ON "Payment" ("registrationId")
WHERE "status" = 'SUCCEEDED' AND "registrationId" IS NOT NULL;
