#!/usr/bin/env bash
# Idempotent dependency + toolchain refresh for the Cloud Agent environment.
# Runs after the repository is checked out. Must terminate and start no
# long-running processes (those belong in start.sh / terminals).
set -euo pipefail

cd "$(dirname "$0")/.."

# --- System dependency: PostgreSQL 16 -------------------------------------
# The app talks to a local Postgres via the Prisma pg driver adapter. Install
# the server package if it is not already present (installing it also creates
# the default `main` cluster via pg_createcluster).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql postgresql-contrib
fi

# --- Node dependencies -----------------------------------------------------
npm ci

# --- Prisma client ---------------------------------------------------------
# Generated into ./generated (see prisma/schema.prisma output). Safe to rerun.
npx prisma generate

echo "install.sh: done"
