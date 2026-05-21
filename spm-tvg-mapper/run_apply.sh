#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SPM_CONFIG:-$PROJECT_DIR/config/spm_targets.test.json}"
RUNNER_PATH="$PROJECT_DIR/tools/run_spm_tvg_mapper.mjs"

if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env.local"
  set +a
fi

if [ -z "${SPM_COOKIE:-}" ] && { [ -z "${SPM_USERNAME:-}" ] || [ -z "${SPM_PASSWORD:-}" ]; }; then
  echo ""
  echo "Es sind keine Login-Daten gesetzt."
  echo "Bitte .env.local aus env.example erstellen oder Umgebungsvariablen setzen:"
  echo "  export SPM_USERNAME='DEIN_BENUTZER'"
  echo "  export SPM_PASSWORD='DEIN_PASSWORT'"
  echo ""
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js wurde nicht gefunden. Bitte installieren: apt install nodejs"
  exit 1
fi

echo ""
echo "SPM TVG Mapper - APPLY"
echo "Dieser Lauf speichert TVG-IDs in SPM."
echo "Vorher sollte ein Dry-Run erfolgreich gewesen sein."
echo "Config: $CONFIG_PATH"
echo ""
printf "Zum Speichern bitte APPLY eintippen: "
read -r CONFIRM
if [ "$CONFIRM" != "APPLY" ]; then
  echo "Abgebrochen. Es wurde nichts gespeichert."
  exit 0
fi

cd "$PROJECT_DIR"

echo ""
echo "Starte Apply-Lauf..."
echo ""

node "$RUNNER_PATH" "--config=$CONFIG_PATH" --apply
