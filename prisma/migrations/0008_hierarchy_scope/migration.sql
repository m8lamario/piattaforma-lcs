-- Competition → Edition → Team è già il modello.
-- Questa migration impedisce che Registration o Payment citino un'edizione diversa da quella della squadra.
-- Non cancella righe. Se trova dati incoerenti, interrompe la transazione.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Registration" r
    JOIN "Team" t ON t.id = r."teamId"
    WHERE r."editionId" <> t."editionId"
  ) THEN
    RAISE EXCEPTION 'hierarchy_registration_team_edition_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Payment" p
    JOIN "Team" t ON t.id = p."teamId"
    WHERE p."editionId" <> t."editionId"
  ) THEN
    RAISE EXCEPTION 'hierarchy_payment_team_edition_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Payment" p
    JOIN "Registration" r ON r.id = p."registrationId"
    WHERE p."editionId" <> r."editionId"
       OR (p."teamId" IS NOT NULL AND p."teamId" <> r."teamId")
  ) THEN
    RAISE EXCEPTION 'hierarchy_payment_registration_scope_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Payment"
    WHERE "registrationId" IS NULL AND "teamId" IS NULL
  ) THEN
    RAISE EXCEPTION 'hierarchy_payment_missing_scope';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_registrationId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_teamId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Registration_id_editionId_key" ON "Registration"("id", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_editionId_key" ON "Team"("id", "editionId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_teamId_editionId_fkey" FOREIGN KEY ("teamId", "editionId") REFERENCES "Team"("id", "editionId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_editionId_fkey" FOREIGN KEY ("registrationId", "editionId") REFERENCES "Registration"("id", "editionId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teamId_editionId_fkey" FOREIGN KEY ("teamId", "editionId") REFERENCES "Team"("id", "editionId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Almeno un ancoraggio: quota giocatore (registrationId) oppure quota squadra (teamId).
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_scope_present_check"
CHECK ("registrationId" IS NOT NULL OR "teamId" IS NOT NULL);

-- Se un pagamento indica sia la registrazione sia la squadra, devono essere la stessa partecipazione.
CREATE OR REPLACE FUNCTION "payment_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW."registrationId" IS NULL AND NEW."teamId" IS NULL THEN
    RAISE EXCEPTION 'payment_missing_scope';
  END IF;

  IF NEW."registrationId" IS NOT NULL AND NEW."teamId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "Registration" r
      WHERE r.id = NEW."registrationId"
        AND r."teamId" = NEW."teamId"
        AND r."editionId" = NEW."editionId"
    ) THEN
      RAISE EXCEPTION 'payment_registration_team_mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Payment_scope_guard"
BEFORE INSERT OR UPDATE OF "registrationId", "teamId", "editionId" ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION "payment_scope_guard"();

CREATE OR REPLACE FUNCTION "registration_payment_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p."registrationId" = NEW.id
      AND (
        p."editionId" IS DISTINCT FROM NEW."editionId"
        OR (p."teamId" IS NOT NULL AND p."teamId" IS DISTINCT FROM NEW."teamId")
      )
  ) THEN
    RAISE EXCEPTION 'registration_payment_scope_mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Registration_payment_scope_guard"
BEFORE UPDATE OF "teamId", "editionId" ON "Registration"
FOR EACH ROW
EXECUTE FUNCTION "registration_payment_scope_guard"();
