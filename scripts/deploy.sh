#!/usr/bin/env bash
# deploy.sh — Pull latest code and redeploy the application container.
# Run on the server: bash ~/app/scripts/deploy.sh

set -euo pipefail

APP_DIR="$HOME/app"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"

echo "==> [$(date '+%F %T')] Deployment started"

cd "$APP_DIR"

# 1. Pull latest code
git pull origin main

# 2. Rebuild app image
docker compose -f "$COMPOSE_FILE" build app

# 3. Restart app container only (zero downtime for infra)
docker compose -f "$COMPOSE_FILE" up -d --no-deps app

# 4. Remove dangling images
docker image prune -f

echo "==> [$(date '+%F %T')] Deployment done"
docker compose -f "$COMPOSE_FILE" ps
