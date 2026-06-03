#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DOMAIN=""
ADMIN_PASSWORD=""
REFERENCE_APP_DIR="/var/www/shareid"
REGISTRY_FILE="/etc/shareid/sites.txt"
CADDYFILE="/etc/caddy/Caddyfile"
MIN_PORT="3003"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/add-site.sh --domain <domain-or-url> --admin-password <password>

Optional:
  --reference-app-dir <dir>   Default: /var/www/shareid
  --registry-file <path>      Default: /etc/shareid/sites.txt
  --caddyfile <path>          Default: /etc/caddy/Caddyfile
  --min-port <port>           Default: 3003
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --admin-password)
      ADMIN_PASSWORD="$2"
      shift 2
      ;;
    --reference-app-dir)
      REFERENCE_APP_DIR="$2"
      shift 2
      ;;
    --registry-file)
      REGISTRY_FILE="$2"
      shift 2
      ;;
    --caddyfile)
      CADDYFILE="$2"
      shift 2
      ;;
    --min-port)
      MIN_PORT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "$DOMAIN" ] || [ -z "$ADMIN_PASSWORD" ]; then
  usage >&2
  exit 1
fi

normalize_host() {
  printf '%s' "$1" \
    | sed -E 's#^[A-Za-z]+://##' \
    | sed -E 's#/.*$##' \
    | sed -E 's#:+$##' \
    | tr '[:upper:]' '[:lower:]'
}

HOST="$(normalize_host "$DOMAIN")"
if [ -z "$HOST" ]; then
  echo "Failed to parse domain from input: $DOMAIN" >&2
  exit 1
fi

if [[ "$HOST" == www.* ]]; then
  WWW_DOMAIN="$HOST"
  APEX_DOMAIN="${HOST#www.}"
else
  APEX_DOMAIN="$HOST"
  WWW_DOMAIN="www.$HOST"
fi

SITE_KEY="${APEX_DOMAIN%%.*}"
SITE_KEY="$(printf '%s' "$SITE_KEY" | tr '[:upper:]' '[:lower:]' | sed -E 's#[^a-z0-9_-]##g')"
if [ -z "$SITE_KEY" ]; then
  echo "Failed to derive site key from domain: $DOMAIN" >&2
  exit 1
fi

SITE_NAME="$(printf '%s' "$SITE_KEY" | tr '[:lower:]' '[:upper:]')"
APP_NAME="$SITE_KEY"
APP_DIR="/var/www/$SITE_KEY"

mkdir -p "$(dirname "$REGISTRY_FILE")"
if [ ! -f "$REGISTRY_FILE" ]; then
  cp "$REPO_ROOT/deploy/sites.txt" "$REGISTRY_FILE"
fi

find_next_port() {
  local port="$MIN_PORT"
  while true; do
    if ! awk -F'|' -v port="$port" '
      $0 !~ /^[[:space:]]*#/ && NF >= 3 && $3 == port { found=1 }
      END { exit found ? 0 : 1 }
    ' "$REGISTRY_FILE"; then
      echo "$port"
      return
    fi
    port=$((port + 1))
  done
}

EXISTING_LINE="$(awk -F'|' -v app="$APP_NAME" '$0 !~ /^[[:space:]]*#/ && $1 == app { print $0 }' "$REGISTRY_FILE" || true)"
if [ -n "$EXISTING_LINE" ]; then
  APP_DIR="$(printf '%s' "$EXISTING_LINE" | awk -F'|' '{print $2}')"
  APP_PORT="$(printf '%s' "$EXISTING_LINE" | awk -F'|' '{print $3}')"
else
  APP_PORT="$(find_next_port)"
fi

REPO_URL="$(git -C "$REFERENCE_APP_DIR" config --get remote.origin.url)"
if [ -z "$REPO_URL" ]; then
  echo "Failed to read remote.origin.url from $REFERENCE_APP_DIR" >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "$REFERENCE_APP_DIR/.env" ]; then
    cp "$REFERENCE_APP_DIR/.env" "$APP_DIR/.env"
  elif [ -f "$APP_DIR/.env.example" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  else
    touch "$APP_DIR/.env"
  fi
fi

set_env_var() {
  local key="$1"
  local value="$2"
  local target="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $0 ~ ("^" key "=") {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$target" > "$tmp_file"
  mv "$tmp_file" "$target"
}

set_env_var "SITE_KEY" "$SITE_KEY" "$APP_DIR/.env"
set_env_var "SHAREID_ADMIN_PASSWORD" "$ADMIN_PASSWORD" "$APP_DIR/.env"

mkdir -p "$APP_DIR/data"
if [ ! -f "$APP_DIR/data/site-config.json" ] && [ -f "$REFERENCE_APP_DIR/data/site-config.json" ]; then
  cp "$REFERENCE_APP_DIR/data/site-config.json" "$APP_DIR/data/site-config.json"
fi

if [ ! -f "$APP_DIR/data/redeem-codes.json" ]; then
  printf '{\n  "items": []\n}\n' > "$APP_DIR/data/redeem-codes.json"
fi

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

cat > "$TEMP_DIR/site-manifest.json" <<EOF
[
  {
    "siteKey": "$SITE_KEY",
    "siteName": "$SITE_NAME",
    "domain": "$WWW_DOMAIN",
    "appDir": "$APP_DIR"
  }
]
EOF

node "$REPO_ROOT/scripts/generate-sites-db-migration.mjs" \
  --manifest "$TEMP_DIR/site-manifest.json" \
  --output "$TEMP_DIR/site-migration.sql"

docker exec -i shareid-postgres psql -U shareid_user -d shareid < "$TEMP_DIR/site-migration.sql"

if [ -z "$EXISTING_LINE" ]; then
  printf '%s|%s|%s\n' "$APP_NAME" "$APP_DIR" "$APP_PORT" >> "$REGISTRY_FILE"
fi

if ! grep -Fq "$WWW_DOMAIN" "$CADDYFILE"; then
  cat >> "$CADDYFILE" <<EOF

$APEX_DOMAIN {
    redir https://$WWW_DOMAIN{uri} 301
}

$WWW_DOMAIN {
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
fi

caddy validate --config "$CADDYFILE"
systemctl reload caddy

bash "$APP_DIR/deploy.sh" --app-name "$APP_NAME" --app-port "$APP_PORT" --app-dir "$APP_DIR"

echo "Added site successfully"
echo "site_key=$SITE_KEY"
echo "app_name=$APP_NAME"
echo "app_dir=$APP_DIR"
echo "app_port=$APP_PORT"
echo "domain=https://$WWW_DOMAIN"
