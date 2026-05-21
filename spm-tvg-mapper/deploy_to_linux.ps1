param(
  [string]$Target = "torsten@ctSTM",
  [string]$RemoteDir = "/opt/spm-tvg-mapper"
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Archive = Join-Path $env:TEMP "spm-tvg-mapper-deploy.tar.gz"
$RemoteArchive = "~/spm-tvg-mapper-deploy.tar.gz"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name wurde nicht gefunden. Bitte pruefen, ob es in PowerShell verfuegbar ist."
  }
}

Require-Command "tar"
Require-Command "scp"
Require-Command "ssh"

Write-Host ""
Write-Host "SPM TVG Mapper Deployment" -ForegroundColor Cyan
Write-Host "Ziel: $Target"
Write-Host "Remote-Ordner: $RemoteDir"
Write-Host ""

if (Test-Path $Archive) {
  Remove-Item $Archive -Force
}

$Items = @(
  "ANLEITUNG_FUER_ANFAENGER.md",
  "AUTOMATISIERUNG.md",
  "LOGIN_ERMITTELN.md",
  "PRODUKTIV_CHECKLISTE.md",
  "PROXMOX_INSTALLATION.md",
  "README.md",
  "DOCKER_WEBUI.md",
  "EINZEILER_INSTALLATION.md",
  "Dockerfile",
  "docker-compose.web.example.yml",
  "env.example",
  "install_webui.sh",
  "run_apply.sh",
  "run_dry_run.sh",
  "config",
  "tools",
  "browser",
  "web"
)

Push-Location $ProjectDir
try {
  tar -czf $Archive @Items
}
finally {
  Pop-Location
}

Write-Host "Archiv erstellt: $Archive"
Write-Host "Kopiere Archiv per scp..."
scp $Archive "${Target}:$RemoteArchive"
if ($LASTEXITCODE -ne 0) {
  throw "scp ist fehlgeschlagen. Bitte Target pruefen, z. B. torsten@10.10.100.xxx"
}

$RemoteCommand = @"
set -e
mkdir -p '$RemoteDir'
tar -xzf $RemoteArchive -C '$RemoteDir'
mkdir -p '$RemoteDir/reports'
chmod +x '$RemoteDir/run_dry_run.sh' '$RemoteDir/run_apply.sh' '$RemoteDir/install_webui.sh'
rm -f $RemoteArchive
echo 'Deployment fertig: $RemoteDir'
echo 'Naechster Schritt: cd $RemoteDir && ./install_webui.sh'
"@

Write-Host "Entpacke auf dem Linux-Host..."
ssh $Target $RemoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "ssh/Remote-Entpacken ist fehlgeschlagen. Bitte SSH-Zugriff und sudo-Rechte pruefen."
}

Write-Host ""
Write-Host "Fertig. Danach auf dem Host:"
Write-Host "cd $RemoteDir"
Write-Host "./install_webui.sh"
