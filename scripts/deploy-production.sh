#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/fattahi-shop}"
ENV_FILE="${ENV_FILE:-.env.production}"
DEPLOY_ENV="${DEPLOY_ENV:-.deploy.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${HEALTH_URL:-https://fattahi-shop.ir/api/health}"
FRONTEND_URL="${FRONTEND_URL:-https://fattahi-shop.ir/}"

cd "$PROJECT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE was not found in $PROJECT_DIR"
  exit 1
fi

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "ERROR: $DEPLOY_ENV was not found in $PROJECT_DIR"
  exit 1
fi

compose() {
  docker compose \
    --env-file "$ENV_FILE" \
    --env-file "$DEPLOY_ENV" \
    -f "$COMPOSE_FILE" \
    "$@"
}

echo "==> Validating Docker Compose configuration"
compose config >/dev/null

echo "==> Starting PostgreSQL"
compose up -d postgres

echo "==> Pulling application images"
compose pull backend frontend

echo "==> Running Prisma production migrations"
compose run --rm backend npx prisma migrate deploy

echo "==> Starting/updating all services"
compose up -d --remove-orphans

echo "==> Container status"
compose ps

echo "==> Waiting for backend health check"
healthy=0
for attempt in $(seq 1 24); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    healthy=1
    break
  fi
  echo "Health check attempt $attempt/24 failed; retrying..."
  sleep 5
done

if [[ "$healthy" -ne 1 ]]; then
  echo "ERROR: backend health check failed: $HEALTH_URL"
  compose logs --tail=120 backend nginx || true
  exit 1
fi

echo "==> Checking frontend"
curl --fail --silent --show-error "$FRONTEND_URL" >/dev/null

echo "==> Removing dangling Docker images"
docker image prune -f

echo "==> Deployment completed successfully"
