-- AlterEnum
-- Nuovo valore usato dalla migration successiva: in PostgreSQL non si può usare
-- un valore enum nello stesso transaction in cui è stato aggiunto.
ALTER TYPE "Role" ADD VALUE 'LEAGUE_SUPERVISOR';
