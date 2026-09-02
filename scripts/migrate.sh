#!/usr/bin/env bash
# Applies every db/migrations/*.sql file in order, inside the Postgres container.
# Re-running is safe only for migrations written to be idempotent; for now we
# just track what's been applied in a schema_migrations table.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

PSQL="docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB"

$PSQL -c "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now());" >/dev/null

for file in db/migrations/*.sql; do
    version="$(basename "$file")"
    already=$($PSQL -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version';")
    if [ "$already" = "1" ]; then
        echo "  skip    $version"
        continue
    fi
    echo "  apply   $version"
    $PSQL < "$file"
    $PSQL -c "INSERT INTO schema_migrations (version) VALUES ('$version');" >/dev/null
done
echo "migrations up to date."
