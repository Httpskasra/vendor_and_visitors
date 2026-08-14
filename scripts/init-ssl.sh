#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"
DEPLOY_ENV="${2:-.deploy.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if [ ! -f "$DEPLOY_ENV" ]; then
  echo "Missing $DEPLOY_ENV"
  echo "Create it from .deploy.env.example after the first images are published to GHCR."
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"

COMPOSE="docker compose --env-file $ENV_FILE --env-file $DEPLOY_ENV -f docker-compose.prod.yml"

echo "[1/5] Pulling images and starting application with HTTP nginx..."
$COMPOSE pull backend frontend
$COMPOSE up -d postgres backend frontend nginx

echo "[2/5] Waiting for nginx..."
sleep 5

echo "[3/5] Requesting Let's Encrypt certificate for $DOMAIN and www.$DOMAIN..."
$COMPOSE run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN" -d "www.$DOMAIN"

echo "[4/5] Enabling HTTPS configuration..."
cp nginx/conf.d/https.conf.template nginx/conf.d/default.conf
$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo "[5/5] Starting automatic certificate renewer..."
$COMPOSE up -d certbot

echo "Done: https://$DOMAIN"
