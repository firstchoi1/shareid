#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/shareid"
APP_NAME="shareid"
APP_PORT="3003"
BRANCH="main"
SKIP_PULL="${1:-}"

cd "$APP_DIR"

echo "===> Record current lockfile hash"
PREV_LOCK_HASH="$(sha1sum package-lock.json 2>/dev/null | awk '{print $1}' || echo "")"

if [ "$SKIP_PULL" != "--skip-pull" ]; then
  echo "===> Pull latest code"
  git pull --ff-only origin "$BRANCH"
else
  echo "===> Skip git pull (requested by caller)"
fi

echo "===> Record new lockfile hash"
NEW_LOCK_HASH="$(sha1sum package-lock.json 2>/dev/null | awk '{print $1}' || echo "")"

if [ ! -d node_modules ] || [ "$PREV_LOCK_HASH" != "$NEW_LOCK_HASH" ]; then
  echo "===> Install dependencies"
  npm ci
else
  echo "===> Dependencies unchanged, skipping npm ci"
fi

echo "===> Clean previous Next build"
rm -rf .next

echo "===> Build app"
npm run build

echo "===> Restart app"
PORT="$APP_PORT" pm2 restart "$APP_NAME" --update-env || \
  PORT="$APP_PORT" pm2 start npm --name "$APP_NAME" --cwd "$APP_DIR" -- run start -- --port "$APP_PORT"

echo "===> Save PM2 process list"
pm2 save

echo "===> Deployment finished"
