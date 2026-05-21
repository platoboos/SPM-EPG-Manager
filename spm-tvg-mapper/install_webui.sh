#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}"
WEB_PORT="${WEB_PORT:-8099}"
SPM_BASE_URL="${SPM_BASE_URL:-}"
SPM_TARGET_NAME="${SPM_TARGET_NAME:-Produktiv SPM}"
SPM_PROFILE_NAME="${SPM_PROFILE_NAME:-spm}"
SPM_USERNAME="${SPM_USERNAME:-}"
SPM_PASSWORD="${SPM_PASSWORD:-}"

say() {
  printf '%s\n' "$*"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    say "Fehlt: $1"
    say "Bitte zuerst installieren oder auf einem Host mit Docker ausfuehren."
    exit 1
  fi
}

prompt_if_empty() {
  var_name="$1"
  prompt="$2"
  current_value="$(eval "printf '%s' \"\${$var_name:-}\"")"
  if [ -z "$current_value" ]; then
    printf '%s: ' "$prompt"
    if [ "$var_name" = "SPM_PASSWORD" ]; then
      stty -echo 2>/dev/null || true
      IFS= read -r entered
      stty echo 2>/dev/null || true
      printf '\n'
    else
      IFS= read -r entered
    fi
    eval "$var_name=\$entered"
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    say "Fehlt: docker compose"
    say "Docker ist da, aber Docker Compose wurde nicht gefunden."
    exit 1
  fi
}

need_cmd docker

prompt_if_empty SPM_BASE_URL "SPM Basis-URL, z.B. http://DEINE-SPM-IP:8000"
prompt_if_empty SPM_USERNAME "SPM Benutzername"
prompt_if_empty SPM_PASSWORD "SPM Passwort"

if [ -z "$SPM_BASE_URL" ] || [ -z "$SPM_USERNAME" ] || [ -z "$SPM_PASSWORD" ]; then
  say "Abbruch: SPM_BASE_URL, SPM_USERNAME und SPM_PASSWORD muessen gesetzt sein."
  exit 1
fi

cd "$PROJECT_DIR"
mkdir -p config reports

if [ ! -f docker-compose.yml ]; then
  if [ -f docker-compose.web.example.yml ]; then
    cp docker-compose.web.example.yml docker-compose.yml
  else
    say "docker-compose.web.example.yml wurde nicht gefunden."
    exit 1
  fi
fi

cat > .env <<EOF
SPM_USERNAME=$SPM_USERNAME
SPM_PASSWORD=$SPM_PASSWORD
EOF
chmod 600 .env

cat > .env.local <<EOF
SPM_USERNAME=$SPM_USERNAME
SPM_PASSWORD=$SPM_PASSWORD
SPM_COOKIE=
EOF
chmod 600 .env.local

cat > config/spm_targets.web.json <<EOF
{
  "meta": {
    "description": "SPM TVG Mapper WebUI-Konfiguration",
    "note": "Benutzername und Passwort werden per Docker-Environment gesetzt."
  },
  "targets": [
    {
      "name": "$SPM_TARGET_NAME",
      "baseUrl": "$SPM_BASE_URL",
      "playlistType": "tv",
      "profileName": "$SPM_PROFILE_NAME",
      "pageSize": 1000,
      "keepExistingTvgIds": true,
      "login": {
        "enabled": true,
        "url": "/api/auth/login",
        "method": "POST",
        "contentType": "json",
        "usernameEnv": "SPM_USERNAME",
        "passwordEnv": "SPM_PASSWORD",
        "usernameField": "username",
        "passwordField": "password",
        "extraFields": {}
      },
      "profileIdByPortalId": {}
    }
  ]
}
EOF

say "Baue/starte SPM TVG Mapper WebUI..."
compose_cmd up -d --build

say ""
say "Fertig."
say "WebUI: http://$(hostname -I 2>/dev/null | awk '{print $1}'):$WEB_PORT"
say "Falls die IP leer ist: http://HOST-IP:$WEB_PORT"
