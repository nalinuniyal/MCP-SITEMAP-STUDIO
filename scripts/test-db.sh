#!/usr/bin/env bash
# Applies the migrations to a throwaway local PostgreSQL (with a Supabase stub)
# and runs the RLS test suite. Requires PostgreSQL 15+ binaries on PATH or in
# PG_BIN. Usage: npm run test:db
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { "$PG_BIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

"$PG_BIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start -w >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X --no-psqlrc)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/grants.sql"
if [ -f "$ROOT/supabase/seed.sql" ]; then echo "applying seed.sql"; "${PSQL[@]}" -f "$ROOT/supabase/seed.sql"; fi
echo "running RLS tests"
"${PSQL[@]}" -f "$ROOT/supabase/tests/rls.test.sql"
