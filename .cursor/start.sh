#!/usr/bin/env bash
# Per-boot reconciliation for the Cloud Agent environment. Brings up the
# database daemon and ensures schema + seed data exist. Must be idempotent,
# reach a ready state, and then return.
set -euo pipefail

cd "$(dirname "$0")/.."

# --- Local dev .env --------------------------------------------------------
# No real secrets are needed: DATABASE_URL points at the local Postgres and
# every external provider (email/storage/payments/monitoring) defaults to a
# stub. Generate a random AUTH_SECRET only when .env is first created.
if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -base64 48 | tr -d '\n')"
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"${secret}\"|" .env
fi

# --- Start PostgreSQL (idempotent) -----------------------------------------
if ! pg_isready -q -h localhost -p 5432; then
  sudo pg_ctlcluster 16 main start || true
fi

# Wait for the daemon to accept connections.
for _ in $(seq 1 30); do
  pg_isready -q -h localhost -p 5432 && break
  sleep 1
done
pg_isready -h localhost -p 5432

# --- Ensure role password + application database ---------------------------
sudo -u postgres psql -qc "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='esl_player_hub'" \
  | grep -q 1 || sudo -u postgres createdb esl_player_hub

# --- Apply migrations + seed (both idempotent) -----------------------------
npx prisma migrate deploy
npx prisma db seed

echo "start.sh: environment ready"
