# Travel Doodles — VPS Deployment with Local `.env`

This guide explains how to deploy Travel Doodles on a single Linux VPS (2 vCPU / 4 GB RAM) using a local `.env` file.

---

## 1. Quick Setup (Docker Compose)

### Step 1: Clone / Copy Repository to VPS
```bash
git clone <your-repo-url> /opt/travel-doodles
cd /opt/travel-doodles
```

### Step 2: Create Your Local `.env` File
Generate a secure session secret and create your `.env`:

```bash
# Generate a cryptographically secure 32-byte secret
SECRET=$(openssl rand -hex 32)

cat <<EOF > .env
# Server
PORT=8080
ENV=production
BASE_URL=https://api.traveldoodles.app
FRONTEND_URL=https://traveldoodles.app

# Database (internal Docker network URL)
DATABASE_URL=postgres://travel_user:travel_password@travel-db:5432/travel_doodles?sslmode=disable
DB_MAX_CONNS=25
DB_MIN_CONNS=5

# Redis (internal Docker network URL)
REDIS_ENABLED=true
REDIS_URL=redis://travel-redis:6379/0
REDIS_KEY_PREFIX=travel:

# Media Storage
# Use 'local' to store images directly on the VPS disk, or 's3' for Cloudflare R2 / AWS S3
STORAGE_TYPE=local
STORAGE_LOCAL_DIR=/app/data/storage
STORAGE_PUBLIC_URL=https://api.traveldoodles.app/media/files

# Security & Sessions
SESSION_SECRET=${SECRET}
SESSION_COOKIE_NAME=travel_session
SESSION_DURATION_HOURS=168
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# Rate Limiting
RATELIMIT_ENABLED=true
RATELIMIT_REQUESTS_PER_MINUTE=120
RATELIMIT_AUTH_PER_MINUTE=10

# Worker Pool
WORKER_CONCURRENCY=4
WORKER_IMAGE_CONCURRENCY=2
WORKER_POLL_INTERVAL_MS=1000
EOF

chmod 600 .env
```

### Step 3: Launch Services
```bash
cd deploy
docker compose up -d --build
```

### Step 4: Verify Deployment
```bash
# 1. Check container status and resource usage
docker compose ps
docker stats --no-stream

# 2. Test Health & Readiness probes
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/readyz

# 3. Check Prometheus metrics
curl http://localhost:8080/metrics
```

---

## 2. Running Directly on the Host (Bare Metal / Systemd)

If you prefer to run the compiled binary directly on the host without Docker:

### Step 1: Install PostgreSQL & PostGIS
```bash
sudo apt update
sudo apt install -y postgresql-16 postgresql-16-postgis-3 redis-server
```

### Step 2: Configure PostgreSQL Database
```bash
sudo -u postgres psql <<EOF
CREATE USER travel_user WITH PASSWORD 'travel_password';
CREATE DATABASE travel_doodles OWNER travel_user;
\c travel_doodles
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
```

### Step 3: Build the Binary
```bash
cd /opt/travel-doodles
go build -ldflags="-w -s" -o bin/travel-api ./cmd/api
```

### Step 4: Create `.env` in Repository Root
```bash
cp .env.example .env
# Edit .env with your production database credentials
```

When `bin/travel-api` starts, it automatically detects and loads the local `.env` file!

### Step 5: Create Systemd Service
Create `/etc/systemd/system/travel-api.service`:
```ini
[Unit]
Description=Travel Doodles API Monolith
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/travel-doodles
ExecStart=/opt/travel-doodles/bin/travel-api
Restart=always
RestartSec=5s
LimitNOFILE=65536
MemoryMax=400M

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now travel-api
sudo systemctl status travel-api
```

---

## 3. Post-Deployment Verification

1. **Verify Migrations**: The API automatically runs pending SQL migrations from `./db/migrations` on startup.
2. **Verify Image Uploads**: Create a test post with a local image to confirm EXIF GPS stripping and thumbnail generation.
3. **Verify Map Clustering**: Query `GET /api/v1/posts/map?bbox=-180,-90,180,90&zoom=3` to test spatial query execution.
