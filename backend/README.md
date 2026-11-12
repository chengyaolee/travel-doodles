# Travel Doodles — Backend Services

Production-ready Go modular monolith engineered for high throughput, low memory overhead (<150MB RSS), and seamless operation on a 1GB–4GB VPS.

## Architecture & Features

- **Runtime**: Go 1.24+ with standard `net/http` and Chi router.
- **Database**: PostgreSQL 16+ with PostGIS spatial extension (`ST_DWithin`, grid snapping, anti-meridian handling).
- **Authentication**: Strict passwordless (FIDO2 WebAuthn Passkeys, instant device-bound credentials, OAuth2). Zero passwords, zero OTPs, no password reset vectors.
- **Friend System**: Mutual friendship with customizable user IDs (`custom_id`, e.g. `wanderer_dan`) and 16-byte invite links (`/join/{code}`). Canonical single-row storage (`user_id_1 < user_id_2`).
- **Media Pipeline**: Direct presigned S3/local uploads, automatic EXIF GPS stripping, and WebP thumbnail generation.
- **Transactional Outbox & Jobs**: Database-backed job queue via PostgreSQL `FOR UPDATE SKIP LOCKED`.

## Directory Structure

```
backend/
├── api/openapi/       # OpenAPI 3.0 specification (openapi.yaml)
├── cmd/
│   ├── api/           # API monolith server entrypoint
│   └── worker/        # Standalone background worker (optional)
├── db/migrations/     # PostgreSQL SQL migrations
├── deploy/            # Docker Compose, Caddyfile, postgres.conf, backup/restore
├── internal/          # Domain services (auth, geo, posts, friends, feed, etc.)
└── tests/             # In-memory integration & high-throughput load tests
```

## Running Locally

```bash
# 1. Start PostgreSQL + PostGIS container
docker compose -f deploy/compose.yaml up -d travel-db

# 2. Configure .env
cp .env.example .env

# 3. Run API server (auto-runs migrations on startup)
go run ./cmd/api
```

## Running Tests

```bash
go test -count=1 ./...
```
