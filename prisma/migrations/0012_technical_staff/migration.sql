-- Staff tecnico: categoria di partecipazione, quota di edizione, limite 5 e allenatore.
-- Non aggiunge un ruolo di permesso. StaffInvite resta l'invito del referente.

CREATE TYPE "ParticipantCategory" AS ENUM ('PLAYER', 'STAFF');

ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'STAFF';

ALTER TABLE "Edition"
  ADD COLUMN "staffFeeAmount" DECIMAL(10, 2) NOT NULL DEFAULT 5;

ALTER TABLE "Registration"
  ADD COLUMN "category" "ParticipantCategory" NOT NULL DEFAULT 'PLAYER';

CREATE INDEX "Registration_teamId_category_status_idx"
  ON "Registration"("teamId", "category", "status");

ALTER TABLE "Team"
  ADD COLUMN "coachRegistrationId" TEXT;

CREATE UNIQUE INDEX "Team_coachRegistrationId_key" ON "Team"("coachRegistrationId");

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_coachRegistrationId_fkey"
  FOREIGN KEY ("coachRegistrationId") REFERENCES "Registration"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION registration_staff_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  occupied integer;
BEGIN
  IF NEW.category = 'STAFF' AND NEW.status NOT IN ('WITHDRAWN', 'REMOVED') THEN
    PERFORM 1 FROM "Team" WHERE id = NEW."teamId" FOR UPDATE;
    SELECT COUNT(*) INTO occupied
    FROM "Registration"
    WHERE "teamId" = NEW."teamId"
      AND category = 'STAFF'
      AND status NOT IN ('WITHDRAWN', 'REMOVED')
      AND id <> NEW.id;
    IF occupied >= 5 THEN
      RAISE EXCEPTION 'STAFF_LIMIT_REACHED' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registration_staff_limit ON "Registration";
CREATE TRIGGER registration_staff_limit
BEFORE INSERT OR UPDATE OF category, status, "teamId"
ON "Registration"
FOR EACH ROW
EXECUTE FUNCTION registration_staff_limit();

CREATE OR REPLACE FUNCTION team_coach_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."coachRegistrationId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "Registration" r
    WHERE r.id = NEW."coachRegistrationId"
      AND r."teamId" = NEW.id
      AND r.category = 'STAFF'
      AND r.status NOT IN ('WITHDRAWN', 'REMOVED')
  ) THEN
    RAISE EXCEPTION 'COACH_INVALID' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_coach_guard ON "Team";
CREATE TRIGGER team_coach_guard
BEFORE INSERT OR UPDATE OF "coachRegistrationId"
ON "Team"
FOR EACH ROW
EXECUTE FUNCTION team_coach_guard();

CREATE OR REPLACE FUNCTION registration_clear_coach()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.category <> 'STAFF'
    OR NEW.status IN ('WITHDRAWN', 'REMOVED')
    OR NEW."teamId" IS DISTINCT FROM OLD."teamId"
  ) THEN
    UPDATE "Team"
    SET "coachRegistrationId" = NULL
    WHERE "coachRegistrationId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registration_clear_coach ON "Registration";
CREATE TRIGGER registration_clear_coach
AFTER UPDATE OF category, status, "teamId"
ON "Registration"
FOR EACH ROW
EXECUTE FUNCTION registration_clear_coach();
