#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DOMAIN=""
ADMIN_PASSWORD=""
REFERENCE_APP_DIR="/var/www/shareid"
REFERENCE_SITE_KEY=""
REGISTRY_FILE="/etc/shareid/sites.txt"
CADDYFILE="/etc/caddy/Caddyfile"
MIN_PORT="3003"
DRY_RUN="false"
CURRENT_STAGE="initialization"
CLONED_APP="false"
REGISTRY_APPENDED="false"
CADDY_APPENDED="false"
DB_BOOTSTRAPPED="false"
SUMMARY_NOTES=()

usage() {
  cat <<'EOF'
Usage:
  bash scripts/add-site.sh --domain <domain-or-url> --admin-password <password>

Optional:
  --reference-app-dir <dir>   Default: /var/www/shareid
  --reference-site-key <key>  Default: inferred from reference app dir
  --registry-file <path>      Default: /etc/shareid/sites.txt
  --caddyfile <path>          Default: /etc/caddy/Caddyfile
  --min-port <port>           Default: 3003
  --dry-run                   Print planned actions without changing server state
EOF
}

log_step() {
  printf '===> %s\n' "$1"
}

append_summary() {
  SUMMARY_NOTES+=("$1")
}

run_cmd() {
  if [ "$DRY_RUN" = "true" ]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

print_failure_summary() {
  local exit_code="$1"
  if [ "$exit_code" -eq 0 ]; then
    return
  fi

  echo >&2
  echo "add-site failed during stage: $CURRENT_STAGE" >&2
  echo "site_key=${SITE_KEY:-unknown}" >&2
  echo "app_dir=${APP_DIR:-unknown}" >&2
  echo "app_port=${APP_PORT:-unknown}" >&2
  echo >&2
  echo "Completed changes before failure:" >&2
  if [ "${#SUMMARY_NOTES[@]}" -eq 0 ]; then
    echo "- none" >&2
  else
    for note in "${SUMMARY_NOTES[@]}"; do
      echo "- $note" >&2
    done
  fi
  echo >&2
  echo "Suggested manual rollback:" >&2
  if [ "$CLONED_APP" = "true" ]; then
    echo "- remove cloned app directory if you want a clean retry: rm -rf '$APP_DIR'" >&2
  fi
  if [ "$REGISTRY_APPENDED" = "true" ]; then
    echo "- remove registry entry from $REGISTRY_FILE: ${APP_NAME}|${APP_DIR}|${APP_PORT}" >&2
  fi
  if [ "$CADDY_APPENDED" = "true" ]; then
    echo "- remove the appended Caddy blocks for $APEX_DOMAIN / $WWW_DOMAIN from $CADDYFILE and run: caddy validate --config '$CADDYFILE' && systemctl reload caddy" >&2
  fi
  if [ "$DB_BOOTSTRAPPED" = "true" ]; then
    echo "- delete DB site data if needed:" >&2
    echo "  docker exec -i shareid-postgres psql -U shareid_user -d shareid -c \"DELETE FROM sites WHERE site_key = '$SITE_KEY';\"" >&2
  fi
  echo "- inspect deploy logs in $APP_DIR before retrying if deployment reached the final stage" >&2
}

on_exit() {
  local exit_code="$1"
  if [ -n "${TEMP_DIR:-}" ] && [ -d "${TEMP_DIR:-}" ]; then
    rm -rf "$TEMP_DIR"
  fi
  print_failure_summary "$exit_code"
}

trap 'on_exit "$?"' EXIT

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
    --reference-site-key)
      REFERENCE_SITE_KEY="$2"
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
    --dry-run)
      DRY_RUN="true"
      shift
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

CURRENT_STAGE="prepare-registry"
log_step "Prepare site registry"
run_cmd mkdir -p "$(dirname "$REGISTRY_FILE")"
if [ ! -f "$REGISTRY_FILE" ]; then
  log_step "Initialize registry from deploy/sites.txt"
  run_cmd cp "$REPO_ROOT/deploy/sites.txt" "$REGISTRY_FILE"
  append_summary "initialized registry file at $REGISTRY_FILE"
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

if [ -z "$REFERENCE_SITE_KEY" ] && [ -f "$REFERENCE_APP_DIR/.env" ]; then
  REFERENCE_SITE_KEY="$(
    awk -F'=' '$1=="SITE_KEY" { print $2 }' "$REFERENCE_APP_DIR/.env" \
      | tail -n 1 \
      | tr -d '"' \
      | tr -d "'" \
      | tr '[:upper:]' '[:lower:]'
  )"
fi

if [ -z "$REFERENCE_SITE_KEY" ]; then
  if [ "$(basename "$REFERENCE_APP_DIR")" = "shareid" ]; then
    REFERENCE_SITE_KEY="pcyid"
  else
    REFERENCE_SITE_KEY="$(basename "$REFERENCE_APP_DIR" | tr '[:upper:]' '[:lower:]')"
  fi
fi

log_step "Resolved site values"
echo "site_key=$SITE_KEY"
echo "site_name=$SITE_NAME"
echo "app_name=$APP_NAME"
echo "app_dir=$APP_DIR"
echo "app_port=$APP_PORT"
echo "domain=https://$WWW_DOMAIN"
echo "reference_app_dir=$REFERENCE_APP_DIR"
echo "reference_site_key=$REFERENCE_SITE_KEY"
echo "registry_file=$REGISTRY_FILE"
echo "caddyfile=$CADDYFILE"
echo "dry_run=$DRY_RUN"

if [ ! -d "$APP_DIR/.git" ]; then
  CURRENT_STAGE="clone-repo"
  log_step "Clone site repository"
  run_cmd git clone "$REPO_URL" "$APP_DIR"
  if [ "$DRY_RUN" != "true" ]; then
    CLONED_APP="true"
    append_summary "cloned repository into $APP_DIR"
  fi
fi

if [ ! -f "$APP_DIR/.env" ]; then
  CURRENT_STAGE="prepare-env"
  log_step "Create .env for new site"
  if [ -f "$REFERENCE_APP_DIR/.env" ]; then
    run_cmd cp "$REFERENCE_APP_DIR/.env" "$APP_DIR/.env"
  elif [ -f "$APP_DIR/.env.example" ]; then
    run_cmd cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  else
    run_cmd touch "$APP_DIR/.env"
  fi
  if [ "$DRY_RUN" != "true" ]; then
    append_summary "created $APP_DIR/.env"
  fi
fi

set_env_var() {
  local key="$1"
  local value="$2"
  local target="$3"
  local tmp_file

  if [ "$DRY_RUN" = "true" ]; then
    echo "[dry-run] set $key in $target"
    return 0
  fi

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

CURRENT_STAGE="write-env"
log_step "Write site environment values"
set_env_var "SITE_KEY" "$SITE_KEY" "$APP_DIR/.env"
set_env_var "SHAREID_ADMIN_PASSWORD" "$ADMIN_PASSWORD" "$APP_DIR/.env"
if [ "$DRY_RUN" != "true" ]; then
  append_summary "updated $APP_DIR/.env with SITE_KEY and SHAREID_ADMIN_PASSWORD"
fi

TEMP_DIR="$(mktemp -d)"

cat > "$TEMP_DIR/site-bootstrap.sql" <<EOF
BEGIN;

INSERT INTO sites (
  site_key,
  site_name,
  domain,
  purchase_url,
  apple_auto_base_url,
  apple_auto_api_key,
  redeem_mode_enabled,
  timezone
)
SELECT
  '$SITE_KEY',
  '$SITE_NAME',
  '$WWW_DOMAIN',
  purchase_url,
  apple_auto_base_url,
  apple_auto_api_key,
  FALSE,
  timezone
FROM sites
WHERE site_key = '$REFERENCE_SITE_KEY'
ON CONFLICT (site_key) DO UPDATE SET
  site_name = EXCLUDED.site_name,
  domain = EXCLUDED.domain,
  updated_at = NOW();

DELETE FROM site_regions
WHERE site_id = (SELECT id FROM sites WHERE site_key = '$SITE_KEY');

DELETE FROM redeem_logs
WHERE site_id = (SELECT id FROM sites WHERE site_key = '$SITE_KEY');

DELETE FROM redeem_codes
WHERE site_id = (SELECT id FROM sites WHERE site_key = '$SITE_KEY');

INSERT INTO site_regions (
  site_id,
  region_key,
  region_label,
  tag_id,
  country_note,
  sort_order,
  created_at,
  updated_at
)
SELECT
  target.id,
  source.region_key,
  source.region_label,
  source.tag_id,
  source.country_note,
  source.sort_order,
  NOW(),
  NOW()
FROM site_regions source
JOIN sites source_site
  ON source_site.id = source.site_id
 AND source_site.site_key = '$REFERENCE_SITE_KEY'
JOIN sites target
  ON target.site_key = '$SITE_KEY';

COMMIT;
EOF

CURRENT_STAGE="bootstrap-database"
log_step "Bootstrap site records in database"
if [ "$DRY_RUN" = "true" ]; then
  echo "[dry-run] docker exec -i shareid-postgres psql -U shareid_user -d shareid < $TEMP_DIR/site-bootstrap.sql"
else
  docker exec -i shareid-postgres psql -U shareid_user -d shareid < "$TEMP_DIR/site-bootstrap.sql"
  DB_BOOTSTRAPPED="true"
  append_summary "bootstrapped database rows for $SITE_KEY"
fi

if [ -z "$EXISTING_LINE" ]; then
  CURRENT_STAGE="register-site"
  log_step "Append site to server registry"
  if [ "$DRY_RUN" = "true" ]; then
    echo "[dry-run] append to $REGISTRY_FILE: $APP_NAME|$APP_DIR|$APP_PORT"
  else
    printf '%s|%s|%s\n' "$APP_NAME" "$APP_DIR" "$APP_PORT" >> "$REGISTRY_FILE"
    REGISTRY_APPENDED="true"
    append_summary "registered $APP_NAME in $REGISTRY_FILE"
  fi
fi

if ! grep -Fq "$WWW_DOMAIN" "$CADDYFILE"; then
  CURRENT_STAGE="update-caddy"
  log_step "Append Caddy reverse proxy rules"
  if [ "$DRY_RUN" = "true" ]; then
    cat <<EOF
[dry-run] append to $CADDYFILE:

$APEX_DOMAIN {
    redir https://$WWW_DOMAIN{uri} 301
}

$WWW_DOMAIN {
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
  else
    cat >> "$CADDYFILE" <<EOF

$APEX_DOMAIN {
    redir https://$WWW_DOMAIN{uri} 301
}

$WWW_DOMAIN {
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
    CADDY_APPENDED="true"
    append_summary "appended Caddy rules for $WWW_DOMAIN"
  fi
fi

CURRENT_STAGE="reload-caddy"
log_step "Validate and reload Caddy"
run_cmd caddy validate --config "$CADDYFILE"
run_cmd systemctl reload caddy
if [ "$DRY_RUN" != "true" ]; then
  append_summary "validated and reloaded Caddy"
fi

CURRENT_STAGE="deploy-app"
log_step "Run first deployment for new site"
run_cmd bash "$APP_DIR/deploy.sh" --app-name "$APP_NAME" --app-port "$APP_PORT" --app-dir "$APP_DIR"
if [ "$DRY_RUN" != "true" ]; then
  append_summary "ran deploy.sh for $APP_NAME"
fi

echo "Added site successfully"
echo "site_key=$SITE_KEY"
echo "app_name=$APP_NAME"
echo "app_dir=$APP_DIR"
echo "app_port=$APP_PORT"
echo "domain=https://$WWW_DOMAIN"
if [ "$DRY_RUN" = "true" ]; then
  echo "mode=dry-run"
fi
