#!/usr/bin/env sh
set -eu
ENV_FILE="${1:-.env.production}"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --build
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml ps
