-- Taglia maglia del giocatore. Null = da inserire al prossimo accesso.
-- Lo staff tecnico non la usa: PERSONAL_DATA resta completo senza questo campo.

ALTER TABLE "PlayerProfile" ADD COLUMN "shirtSize" TEXT;
