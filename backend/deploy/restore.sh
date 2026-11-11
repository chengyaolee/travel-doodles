#!/usr/bin/env bash
# Database Restoration Procedure for Travel Doodles

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path-to-backup-file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-travel-db}"
DB_USER="${DB_USER:-travel_user}"
DB_NAME="${DB_NAME:-travel_doodles}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file ${BACKUP_FILE} not found!"
    exit 1
fi

# 1. Verify Checksum if present
if [ -f "${BACKUP_FILE}.sha256" ]; then
    echo "Verifying SHA-256 checksum..."
    sha256sum -c "${BACKUP_FILE}.sha256"
fi

echo "WARNING: This will overwrite existing database '${DB_NAME}' in container '${CONTAINER_NAME}'."
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restoration aborted."
    exit 0
fi

echo "Terminating existing active connections to ${DB_NAME}..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

echo "Restoring database from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "Restoration complete! Running PostGIS verification query..."
docker exec -t "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c \
    "SELECT COUNT(*) AS total_posts, PostGIS_Version() AS postgis_version FROM posts;"

echo "Database restored and verified successfully."
