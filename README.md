# High Five Low Five

A place to publish ranked lists — top five horror movies, worst three albums,
your Mount Rushmore of NBA centers — and argue about them in the comments.

Lists are freeform: any length, any topic, ranked or not.

## Stack

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| Backend  | Go, chi, pgx, JWT + bcrypt                      |
| Database | Postgres 16 (Docker, host port **5433**)        |
| Frontend | React 19, Vite, Tailwind 4, react-router        |

Port 5433 is deliberate — it keeps this database from colliding with another
local Postgres on the default 5432.

## Running it

```bash
cp .env.example .env          # then fill in the CHANGEME values
docker compose up -d          # Postgres
./scripts/migrate.sh          # apply db/migrations/*.sql

cd api && go run .            # API on :8081
cd web && npm install && npm run dev   # UI on :5173
```

## Schema changes

Add a new numbered file to `db/migrations/` and run `./scripts/migrate.sh`.
Applied versions are recorded in a `schema_migrations` table, so re-running is
safe and only new files execute. Never hand-edit a live database.

## Layout

```
api/     Go API — config, db pool, auth, handlers
web/     React app — pages, components, auth context
db/      SQL migrations
scripts/ migrate.sh
```
