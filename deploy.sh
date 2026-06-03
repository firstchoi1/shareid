#!/bin/bash
set -euo pipefail

BRANCH="main"
APP_DIR="$(pwd)"
APP_NAME=""
APP_PORT=""
SKIP_PULL="false"
FORCE_INSTALL="false"

restore_safe_tracked_files() {
  for tracked_file in next-env.d.ts package-lock.json; do
    if git ls-files --error-unmatch "$tracked_file" >/dev/null 2>&1; then
      echo "===> Restore tracked deployment artifact: $tracked_file"
      git restore --worktree --staged "$tracked_file" 2>/dev/null || git checkout -- "$tracked_file"
    fi
  done
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --app-port)
      APP_PORT="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --skip-pull)
      SKIP_PULL="true"
      shift
      ;;
    --force-install)
      FORCE_INSTALL="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$APP_NAME" ] || [ -z "$APP_PORT" ]; then
  echo "Usage: bash ./deploy.sh --app-name <name> --app-port <port> [--app-dir <dir>] [--branch <branch>] [--skip-pull] [--force-install]" >&2
  exit 1
fi

cd "$APP_DIR"

restore_safe_tracked_files

echo "===> Record current manifest hash"
PREV_MANIFEST_HASH="$(
  (
    sha1sum package.json 2>/dev/null || true
    sha1sum package-lock.json 2>/dev/null || true
  ) | sha1sum | awk '{print $1}'
)"

if [ "$SKIP_PULL" != "true" ]; then
  echo "===> Pull latest code"
  git pull --ff-only origin "$BRANCH"
else
  echo "===> Skip git pull (requested by caller)"
fi

echo "===> Record new manifest hash"
NEW_MANIFEST_HASH="$(
  (
    sha1sum package.json 2>/dev/null || true
    sha1sum package-lock.json 2>/dev/null || true
  ) | sha1sum | awk '{print $1}'
)"

if [ "$FORCE_INSTALL" = "true" ] || [ ! -d node_modules ] || [ "$PREV_MANIFEST_HASH" != "$NEW_MANIFEST_HASH" ]; then
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
