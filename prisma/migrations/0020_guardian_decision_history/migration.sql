-- Storico append-only delle correzioni del genitore: valore nuovo, valore precedente.
ALTER TABLE "GuardianAuthorizationDecision"
ADD COLUMN "value" TEXT,
ADD COLUMN "previousAccepted" BOOLEAN,
ADD COLUMN "previousValue" TEXT;
