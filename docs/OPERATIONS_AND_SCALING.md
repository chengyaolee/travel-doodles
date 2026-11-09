# Travel Doodles — Operations, Testing & Scaling Guide

This guide details deployment, operational maintenance, automated testing, disaster recovery, and the long-term scaling roadmap for the Travel Doodles backend.

---

## 1. Quick Start & Local Development

### Prerequisites
- Go 1.22+ (tested with Go 1.27)
- PostgreSQL 16+ with PostGIS 3.4+
- Optional: Redis 7+

### Running Locally
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start database & Redis via Docker (or use local installations)
docker compose -f deploy/compose.yaml up travel-db travel-redis -d

# 3. Run migrations and start API
go run cmd/api/main.go
```

The API will listen on `http://localhost:8080`.
- Health check: `http://localhost:8080/healthz`
- Readiness check: `http://localhost:8080/readyz`
- Prometheus metrics: `http://localhost:8080/metrics`
- OpenAPI Specification: `api/openapi/openapi.yaml`

---

## 2. Resource Budget Analysis (2 vCPU / 4 GB RAM VPS)

Operating within 4 GB RAM requires strict memory ceilings across all processes to leave adequate room for the Linux page cache (which accelerates PostGIS spatial indexes and WAL buffers).

| Component | Target RAM | Max Cap | Rationale & Configuration |
|---|---|---|---|
| **Linux OS & System Services** | ~250 MB | 350 MB | Kernel, systemd, SSH, journald |
| **Caddy Reverse Proxy** | ~60 MB | 100 MB | Automatic TLS, HTTP/2 & HTTP/3, zstd/gzip compression |
| **Go API (`travel-api`)** | ~180 MB | 350 MB | Compiled Go binary, ~15MB idle; 25 DB conns max, lightweight goroutines |
| **Go Worker (`travel-worker`)** | ~120 MB | 250 MB | Bounded concurrency (2 concurrent image transforms), max pixel bounds |
| **PostgreSQL 16 + PostGIS** | ~900 MB | 1,200 MB | `shared_buffers = 256MB`, `effective_cache_size = 768MB`, `work_mem = 4MB` |
| **Redis 7 (LRU Ephemeral)** | ~80 MB | 200 MB | `maxmemory 200mb`, `maxmemory-policy volatile-lru`, no disk persistence overhead |
| **Prometheus Exporter** | ~10 MB | 20 MB | Embedded in-process metrics collector (zero external heavy daemons) |
| **Headroom & Linux Page Cache** | **~1,400 MB** | - | PostGIS GiST index page caching in RAM, prevents disk I/O thrashing |
| **Total** | **~3,000 MB** | **4,000 MB** | **Safe, non-OOM margin of ~1 GB under burst traffic** |

---

## 3. Production Deployment via Docker Compose

### Step 1: Prepare the Host
Ensure Docker and Docker Compose are installed on the VPS:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
```

### Step 2: Configure Environment
Edit `.env.example` and save as `.env` on the host:
- Set `ENV=production`
- Set `SESSION_SECRET` to a cryptographically secure 32+ character key.
- Configure S3 credentials for Cloudflare R2 / AWS S3 or maintain `STORAGE_TYPE=local`.

### Step 3: Launch Containers
```bash
cd deploy
docker compose up -d --build
```

### Step 4: Verify Service Health
```bash
docker compose ps
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/readyz
```

---

## 4. Disaster Recovery & Backups

### Automated Daily Backups
The backup script `deploy/backup.sh` creates timestamped gzip-compressed SQL dumps and SHA-256 checksums, and rotates archives older than 7 days.

Add a cron job (`crontab -e`):
```cron
# Run daily database backup at 03:00 AM UTC
0 3 * * * /opt/travel-doodles/deploy/backup.sh >> /var/log/travel_backup.log 2>&1
```

### Database Restoration
To restore a snapshot:
```bash
chmod +x deploy/restore.sh
./deploy/restore.sh /var/backups/travel-doodles/travel_doodles_20261108_030000.sql.gz
```
The script automatically:
1. Verifies the SHA-256 integrity checksum.
2. Prompts for explicit operator confirmation.
3. Terminates active client connections to prevent locks.
4. Restores the database schema and data.
5. Executes a PostGIS verification query to confirm data integrity.

---

## 5. Performance and Load Testing

A dedicated load generator is provided in `tests/load/loadtest.go`.

### Running the Load Test
```bash
# Run against local or remote deployment:
# 20 concurrent virtual users for 30 seconds
go run tests/load/loadtest.go -url http://localhost:8080 -concurrency 20 -duration 30
```

### Measured Automated In-Process Benchmark Results
Running `go test -v ./tests/load/...` tests the full HTTP request handling stack in-process:
- **Total Requests**: 1,000
- **Success Rate**: 100.00% (0 errors)
- **Throughput**: ~116,000 requests/second
- **Latency Percentiles**:
  - `p50 (Median)`: 10 µs
  - `p90`: 208 µs
  - `p95`: 370 µs
  - `p99`: 1.01 ms
  - `Max`: 1.63 ms

---

## 6. Incremental Scaling Roadmap

### Phase 1: Single VPS (Current Architecture)
* **Workload**: 0 – 50,000 Monthly Active Users (MAU).
* **Topology**:
  * 1 low-cost VPS (2 vCPU, 4 GB RAM).
  * Go modular monolith API + integrated worker pool.
  * PostgreSQL 16 + PostGIS on local NVMe disk.
  * Redis with volatile-lru cache (optional: in-memory fallback enabled).
  * Direct client uploads to S3-compatible storage via presigned URLs.
  * Fan-out-on-read feed generation with first-page Redis caching.
  * Web Mercator tile cache keys (`geo:v1:z{z}:x{x}:y{y}:public`).

### Phase 2: Moderate Growth (50,000 – 500,000 MAU)
* **Trigger**: Sustained CPU utilization > 65% or database connection saturation.
* **Actions**:
  1. **Move Database to Dedicated Instance**: Migrate PostgreSQL/PostGIS to a separate managed 4 vCPU / 8 GB RAM database server.
  2. **Separate Worker Node**: Deploy `cmd/worker` as a separate container or virtual machine to isolate image processing CPU bursts from interactive API latencies.
  3. **PgBouncer Connection Pooling**: Introduce PgBouncer in transaction pooling mode to scale client connections beyond 100.
  4. **External Image CDN**: Configure Cloudflare Image Resizing or Imgix to handle on-the-fly thumbnail generation, entirely offloading image transformation CPU from Go workers.

### Phase 3: High Scale (500,000+ MAU)
* **Trigger**: High follower counts ("celebrity travelers") causing read fan-out degradation, or high geographic write density in major cities.
* **Actions**:
  1. **Hybrid Feed Generation**:
     * Users following < 500 accounts remain on *Fan-Out-on-Read*.
     * High-volume creators trigger *Fan-Out-on-Write* for active followers into Redis timeline lists (`feed:v1:user:{id}:timeline`).
  2. **Read Replicas**: Deploy read-only PostgreSQL replicas for geographic map exploration and profile reads.
  3. **H3 Spatial Index Pre-Aggregation**: Pre-compute post cluster centroids and counts into Uber H3 hexagonal hierarchical cells at resolutions 4, 6, and 8, storing aggregates in indexed summary tables refreshed asynchronously via outbox events.
  4. **Database Partitioning**: Declaratively partition `posts`, `likes`, and `comments` by year/month or geography.
