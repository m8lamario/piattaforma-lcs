-- One stable registration link per team (plaintext token, unique).
ALTER TABLE "Team" ADD COLUMN "registrationToken" TEXT;

UPDATE "Team"
SET "registrationToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "registrationToken" IS NULL;

ALTER TABLE "Team" ALTER COLUMN "registrationToken" SET NOT NULL;

CREATE UNIQUE INDEX "Team_registrationToken_key" ON "Team"("registrationToken");
