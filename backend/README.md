# Reminders App — Backend API

Laravel 12 REST API backend for the Reminders App (local-first notes, shopping lists, reminders with optional cloud sync).

## Stack

| Component   | Version  |
|-------------|----------|
| PHP         | 8.5+     |
| Laravel     | 12.x     |
| PostgreSQL  | 17+      |
| Redis       | 7+       |
| Sanctum     | 4.x      |
| Pest        | 3.x      |

## Prerequisites

- Docker >= 24
- Docker Compose V2 (`docker compose`)
- `openssl` (for self-signed cert generation — already done in `docker/certs/`)

## First launch

### 1. Clone and copy env

```bash
cp .env.example .env
```

### 2. Generate APP_KEY

```bash
docker compose run --rm app php artisan key:generate
```

### 3. Start all services

```bash
docker compose up -d
```

Services started:

- `app` — PHP 8.5-FPM (code at http/https via nginx)
- `nginx` — HTTP :8080, HTTPS :8443
- `db` — PostgreSQL 17 (internal compose network only; no host port published)
- `redis` — Redis 7 (internal compose network only; no host port published)

> **Note:** `db` and `redis` do not bind to the host to avoid conflicts with locally
> installed PostgreSQL/Redis. If you need direct host access, temporarily add
> `ports: ["5433:5432"]` to `db` and `ports: ["6380:6379"]` to `redis` in
> `docker-compose.yml`.

### 4. Run migrations

```bash
docker compose exec app php artisan migrate
```

The `docker/postgres/init.sql` is executed automatically on first DB creation
(creates `sync_revision_seq` sequence and `pg_trgm` extension).

### 5. Verify

Open <https://localhost:8443/up> (health check) — browser will warn about self-signed cert, accept it for local dev.

HTTP redirects to HTTPS automatically.

## Daily development

```bash
# Start
docker compose up -d

# Run artisan commands
docker compose exec app php artisan <command>

# Run tests
docker compose exec app php artisan test
# or directly:
docker compose exec app ./vendor/bin/pest

# Tail logs
docker compose logs -f app

# Stop
docker compose down
```

## Running tests

Tests use `.env.testing` (array cache/session, sync queue). For full integration tests with PostgreSQL, use the GitHub Actions workflow which spins up a real PostgreSQL service.

```bash
# Inside the container (after docker compose up -d):
docker compose exec app php artisan test

# Or one-off without full compose:
docker compose run --rm app php artisan test
```

## Horizon (queue worker)

Horizon is optional and runs under the `horizon` Docker Compose profile:

```bash
docker compose --profile horizon up -d
```

## API

All endpoints are prefixed with `/api/v1`.

Authentication: Bearer token via Laravel Sanctum (`Authorization: Bearer <token>`).

See `routes/api.php` for the full route map and `docs/architecture/mvp-architecture.md` for the API contract.

## HTTPS / SSL

A self-signed certificate is pre-generated in `docker/certs/` for local development.

For production, replace `docker/certs/selfsigned.crt` and `docker/certs/selfsigned.key` with real certificates (e.g. Let's Encrypt). See comments in `docker-compose.prod.yml`.

## Production deploy

```bash
# Build and start production image
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

Production image (`target: production` in Dockerfile) runs `config:cache`, `route:cache`, `view:cache` at build time and sets `APP_DEBUG=false`.

## Project structure

```text
app/
  Actions/        # Invokable action classes (one action = one operation)
  Data/           # DTO classes (readonly, spatie/laravel-data)
  Enums/          # PHP backed enums
  Http/
    Controllers/  # Thin controllers, delegate to Actions
    Requests/     # Form Request validation
    Resources/    # API Resources (snake_case JSON output)
  Models/
    Concerns/     # Traits: HasUuid, TracksSyncRevision
  Policies/       # Authorization policies
routes/
  api.php         # All /api/v1/* routes
docker/
  php/            # Dockerfile, php.ini
  nginx/          # Nginx vhost (HTTP->HTTPS redirect + SSL)
  postgres/       # init.sql (sync_revision_seq, pg_trgm)
  certs/          # Self-signed SSL certificate (dev only)
```
