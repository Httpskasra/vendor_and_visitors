#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/fattahi-shop}"
ENV_FILE="${ENV_FILE:-.env.production}"
DEPLOY_ENV="${DEPLOY_ENV:-.deploy.env}"
PREVIOUS_ENV="${PREVIOUS_ENV:-.deploy.env.previous}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$PROJECT_DIR"

if [[ ! -f "$PREVIOUS_ENV" ]]; then
  echo "ERROR: $PREVIOUS_ENV does not exist; there is no recorded previous image release."
  exit 1
fi

cp "$DEPLOY_ENV" "${DEPLOY_ENV}.failed.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
cp "$PREVIOUS_ENV" "$DEPLOY_ENV"
chmod 600 "$DEPLOY_ENV"

docker compose \
  --env-file "$ENV_FILE" \
  --env-file "$DEPLOY_ENV" \
  -f "$COMPOSE_FILE" \
  pull backend frontend

docker compose \
  --env-file "$ENV_FILE" \
  --env-file "$DEPLOY_ENV" \
  -f "$COMPOSE_FILE" \
  up -d backend frontend nginx

echo "Application images rolled back to .deploy.env.previous."
echo "IMPORTANT: Prisma/database migrations are NOT rolled back automatically."
