# Multi-stage Dockerfile for Travel Doodles Go backend
# Stage 1: Build
FROM golang:1.27-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build API binary with size and symbol optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/bin/travel-api ./cmd/api

# Build Worker binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/bin/travel-worker ./cmd/worker

# Stage 2: Final Minimal Runtime (~20MB total image size)
FROM alpine:3.20

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Create unprivileged user for runtime security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/bin/travel-api /app/travel-api
COPY --from=builder /app/bin/travel-worker /app/travel-worker
COPY --from=builder /app/db/migrations /app/db/migrations

# Ensure local storage directory permissions
RUN mkdir -p /app/data/storage && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["/app/travel-api"]
