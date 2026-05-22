$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundledNode = "C:\Users\torst\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ConfigPath = Join-Path $ProjectDir "config\spm_targets.test.json"
$RunnerPath = Join-Path $ProjectDir "tools\run_spm_tvg_mapper.mjs"

function Get-NodePath {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }
  if (Test-Path $BundledNode) {
    return $BundledNode
  }
  throw "Node.js wurde nicht gefunden. Bitte Node.js installieren oder den Pfad im Starter anpassen."
}

if ((-not $env:SPM_COOKIE) -and ((-not $env:SPM_USERNAME) -or (-not $env:SPM_PASSWORD))) {
  Write-Host ""
  Write-Host "Es sind keine Login-Daten gesetzt." -ForegroundColor Yellow
  Write-Host "Bitte entweder den Cookie setzen:"
  Write-Host '$env:SPM_COOKIE = ''session=DEIN_COOKIE_WERT''' -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Oder Benutzer und Passwort setzen:"
  Write-Host '$env:SPM_USERNAME = ''DEIN_BENUTZER''' -ForegroundColor Cyan
  Write-Host '$env:SPM_PASSWORD = ''DEIN_PASSWORT''' -ForegroundColor Cyan
  Write-Host ""
  exit 1
}

Write-Host ""
Write-Host "SPM EPG Manager - APPLY" -ForegroundColor Yellow
Write-Host "Dieser Lauf speichert TVG-IDs im Test-SPM."
Write-Host "Vorher sollte ein Dry-Run erfolgreich gewesen sein."
if ($env:SPM_COOKIE) {
  if ($env:SPM_USERNAME -and $env:SPM_PASSWORD) {
    Write-Host "Anmeldung: Benutzer/Passwort ueber SPM Login-API; vorhandener SPM_COOKIE wird ignoriert"
  } else {
    Write-Host "Anmeldung: vorhandener SPM_COOKIE"
  }
} else {
  Write-Host "Anmeldung: Benutzer/Passwort ueber SPM Login-API"
}
Write-Host ""
$Confirm = Read-Host "Zum Speichern bitte APPLY eintippen"
if ($Confirm -ne "APPLY") {
  Write-Host "Abgebrochen. Es wurde nichts gespeichert."
  exit 0
}

$NodePath = Get-NodePath
Set-Location $ProjectDir

Write-Host ""
Write-Host "Starte Apply-Lauf..."
Write-Host ""

& $NodePath $RunnerPath --config=$ConfigPath --apply

