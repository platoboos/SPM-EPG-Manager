#!/usr/bin/env sh
set -eu

CONFIG_FILE="${CONFIG_FILE:-.env}"

say() {
  printf '%s\n' "$*"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    say "Fehlt: $1"
    exit 1
  fi
}

load_config() {
  if [ -f "$CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    case "$CONFIG_FILE" in
      */*) . "$CONFIG_FILE" ;;
      *) . "./$CONFIG_FILE" ;;
    esac
  fi
}

prompt_if_empty() {
  var_name="$1"
  prompt="$2"
  current_value="$(eval "printf '%s' \"\${$var_name:-}\"")"
  if [ -z "$current_value" ]; then
    printf '%s: ' "$prompt"
    if [ "$var_name" = "SPM_PASSWORD" ]; then
      stty -echo < /dev/tty 2>/dev/null || true
      IFS= read -r entered < /dev/tty
      stty echo < /dev/tty 2>/dev/null || true
      printf '\n'
    else
      IFS= read -r entered < /dev/tty
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
    exit 1
  fi
}

download_file() {
  url="$1"
  dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    say "Fehlt: curl oder wget"
    exit 1
  fi
}

install_mapper() {
  if [ -z "${MAPPER_ARCHIVE_URL:-}" ]; then
    say "MAPPER_ARCHIVE_URL fehlt."
    say "Setze die URL zu deinem GitHub-Archiv oder kopiere den Mapper vorher nach INSTALL_DIR."
    exit 1
  fi

  tmp_dir="$(mktemp -d)"
  archive="$tmp_dir/spm-tvg-mapper.tar.gz"
  extract="$tmp_dir/extract"
  mkdir -p "$extract"

  say "Lade Mapper-Paket..."
  download_file "$MAPPER_ARCHIVE_URL" "$archive"

  say "Entpacke Mapper-Paket..."
  tar -xzf "$archive" -C "$extract"

  root_dir="$(find "$extract" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [ -z "$root_dir" ]; then
    say "Archiv enthält keinen Projektordner."
    exit 1
  fi
  if [ -d "$root_dir/spm-tvg-mapper" ]; then
    first_dir="$root_dir/spm-tvg-mapper"
  else
    first_dir="$root_dir"
  fi

  mkdir -p "$INSTALL_DIR"
  cp -R "$first_dir"/. "$INSTALL_DIR"/
  mkdir -p "$INSTALL_DIR/reports"
  chmod +x "$INSTALL_DIR"/*.sh 2>/dev/null || true
}

write_mapper_config() {
  cd "$INSTALL_DIR"

  if [ ! -f docker-compose.yml ]; then
    cp docker-compose.web.example.yml docker-compose.yml
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

  mkdir -p config reports
  cat > config/spm_targets.web.json <<EOF
{
  "meta": {
    "description": "SPM EPG Manager Produktiv-Konfiguration",
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
}

install_easyepg_settings() {
  if [ -z "${EASYEPG_SETTINGS_URL:-}" ]; then
    return 0
  fi

  tmp_settings="$(mktemp)"
  say "Lade EasyEPG settings.json..."
  download_file "$EASYEPG_SETTINGS_URL" "$tmp_settings"

  if command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$tmp_settings"
  fi

  stamp="$(date +%Y%m%d_%H%M%S)"

  if [ -n "${EASYEPG_HOST_SETTINGS_PATH:-}" ]; then
    say "Sichere vorhandene EasyEPG Host-Datei..."
    if [ -f "$EASYEPG_HOST_SETTINGS_PATH" ]; then
      cp "$EASYEPG_HOST_SETTINGS_PATH" "$EASYEPG_HOST_SETTINGS_PATH.backup_$stamp"
    fi
    cp "$tmp_settings" "$EASYEPG_HOST_SETTINGS_PATH"
    say "EasyEPG Host-Datei aktualisiert: $EASYEPG_HOST_SETTINGS_PATH"
  fi

  if [ -n "${EASYEPG_CONTAINER:-}" ]; then
    need_cmd docker
    say "Sichere vorhandene EasyEPG Container-Datei..."
    docker cp "$EASYEPG_CONTAINER:$EASYEPG_SETTINGS_PATH" "./easyepg_settings.backup_$stamp.json" 2>/dev/null || true
    docker cp "$tmp_settings" "$EASYEPG_CONTAINER:$EASYEPG_SETTINGS_PATH"
    say "EasyEPG Container-Datei aktualisiert: $EASYEPG_CONTAINER:$EASYEPG_SETTINGS_PATH"
  fi
}

main() {
  INSTALL_DIR="${INSTALL_DIR:-/opt/spm-tvg-mapper}"
  WEB_PORT="${WEB_PORT:-8099}"
  SPM_TARGET_NAME="${SPM_TARGET_NAME:-Produktiv SPM}"
  SPM_PROFILE_NAME="${SPM_PROFILE_NAME:-spm}"
  SPM_BASE_URL="${SPM_BASE_URL:-}"
  SPM_USERNAME="${SPM_USERNAME:-}"
  SPM_PASSWORD="${SPM_PASSWORD:-}"

  load_config

  INSTALL_DIR="${INSTALL_DIR:-/opt/spm-tvg-mapper}"
  WEB_PORT="${WEB_PORT:-8099}"
  SPM_TARGET_NAME="${SPM_TARGET_NAME:-Produktiv SPM}"
  SPM_PROFILE_NAME="${SPM_PROFILE_NAME:-spm}"

  need_cmd docker
  need_cmd tar

  prompt_if_empty MAPPER_ARCHIVE_URL "Mapper GitHub/Unraid Archiv-URL"
  prompt_if_empty SPM_BASE_URL "SPM Basis-URL, z.B. http://DEINE-SPM-IP:8000"
  prompt_if_empty SPM_USERNAME "SPM Benutzername"
  prompt_if_empty SPM_PASSWORD "SPM Passwort"

  install_mapper
  write_mapper_config
  install_easyepg_settings

  say "Starte Mapper-WebUI..."
  cd "$INSTALL_DIR"
  compose_cmd up -d --build

  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  say ""
  say "Fertig."
  say "Mapper-WebUI: http://${host_ip:-HOST-IP}:$WEB_PORT"
  say "Nächster Schritt: Im Browser 'Nur prüfen' starten."
}

main "$@"

