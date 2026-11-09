#!/usr/bin/env bash
# Automated PostgreSQL Backup Script for Travel Doodles
# Preserves data integrity on a low-cost single VPS with offsite copy support

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/travel-doodles}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/travel_doodles_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="${CONTAINER_NAME:-travel-db}"
DB_USER="${DB_USER:-travel_user}"
DB_NAME="${DB_NAME:-travel_doodles}"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting database backup..."

# 1. Execute pg_dump inside container and pipe through gzip
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner | gzip -9 > "${BACKUP_FILE}"

# 2. Generate SHA-256 Checksum for verification
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# 3. Optional: Sync to offsite S3/R2 storage if S3_BACKUP_BUCKET is set
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Uploading backup to offsite S3: ${S3_BACKUP_BUCKET}..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/backups/$(basename "${BACKUP_FILE}")"
    aws s3 cp "${BACKUP_FILE}.sha256" "s3://${S3_BACKUP_BUCKET}/backups/$(basename "${BACKUP_FILE}.sha256")"
fi

# 4. Rotate old local backups
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "travel_doodles_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup process completed."
