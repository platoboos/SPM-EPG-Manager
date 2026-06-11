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

install_stream_manager() {
  if [ -z "${STREAM_ARCHIVE_URL:-}" ]; then
    say "STREAM_ARCHIVE_URL fehlt."
    exit 1
  fi

  tmp_dir="$(mktemp -d)"
  archive="$tmp_dir/spm-stream-manager.tar.gz"
  extract="$tmp_dir/extract"
  mkdir -p "$extract"

  say "Lade Stream-Manager-Paket..."
  download_file "$STREAM_ARCHIVE_URL" "$archive"

  say "Entpacke Stream-Manager-Paket..."
  tar -xzf "$archive" -C "$extract"

  root_dir="$(find "$extract" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [ -z "$root_dir" ]; then
    say "Archiv enthält keinen Projektordner."
    exit 1
  fi
  if [ -d "$root_dir/spm-stream-manager" ]; then
    first_dir="$root_dir/spm-stream-manager"
  else
    first_dir="$root_dir"
  fi

  mkdir -p "$INSTALL_DIR"
  cp -R "$first_dir"/. "$INSTALL_DIR"/
}

write_stream_config() {
  cd "$INSTALL_DIR"

  if [ ! -f docker-compose.yml ]; then
    cp docker-compose.example.yml docker-compose.yml
  fi

  cat > .env <<EOF
SPM_BASE_URL=$SPM_BASE_URL
SPM_USERNAME=$SPM_USERNAME
SPM_PASSWORD=$SPM_PASSWORD
WEB_PORT=$WEB_PORT
ACTIVE_WINDOW_MINUTES=$ACTIVE_WINDOW_MINUTES
ACTIVE_GROUP_BY=$ACTIVE_GROUP_BY
EOF
  chmod 600 .env
}

main() {
  INSTALL_DIR="${INSTALL_DIR:-/opt/spm-stream-manager}"
  WEB_PORT="${WEB_PORT:-8100}"
  SPM_BASE_URL="${SPM_BASE_URL:-}"
  SPM_USERNAME="${SPM_USERNAME:-}"
  SPM_PASSWORD="${SPM_PASSWORD:-}"
  ACTIVE_WINDOW_MINUTES="${ACTIVE_WINDOW_MINUTES:-180}"
  ACTIVE_GROUP_BY="${ACTIVE_GROUP_BY:-viewer}"

  load_config

  INSTALL_DIR="${INSTALL_DIR:-/opt/spm-stream-manager}"
  WEB_PORT="${WEB_PORT:-8100}"
  ACTIVE_WINDOW_MINUTES="${ACTIVE_WINDOW_MINUTES:-180}"
  ACTIVE_GROUP_BY="${ACTIVE_GROUP_BY:-viewer}"

  need_cmd docker
  need_cmd tar

  prompt_if_empty STREAM_ARCHIVE_URL "Stream Manager GitHub/Unraid Archiv-URL"
  prompt_if_empty SPM_BASE_URL "SPM Basis-URL, z.B. http://DEINE-SPM-IP:8000"
  prompt_if_empty SPM_USERNAME "SPM Benutzername"
  prompt_if_empty SPM_PASSWORD "SPM Passwort"

  install_stream_manager
  write_stream_config

  say "Starte Stream-Manager-WebUI..."
  cd "$INSTALL_DIR"
  compose_cmd up -d --build

  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  say ""
  say "Fertig."
  say "Stream-Manager-WebUI: http://${host_ip:-HOST-IP}:$WEB_PORT"
  say "Nächster Schritt: Im Browser prüfen, ob Proxy Logs angezeigt werden."
}

main "$@"
