param(
  [string]$Target = "torsten@DEINE-SPM-IP",
  [string]$RemoteDir = "/opt/spm-stream-manager"
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Archive = Join-Path $env:TEMP "spm-stream-manager-deploy.tar.gz"
$RemoteArchive = "~/spm-stream-manager-deploy.tar.gz"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name wurde nicht gefunden. Bitte prüfen, ob es in PowerShell verfügbar ist."
  }
}

Require-Command "tar"
Require-Command "scp"
Require-Command "ssh"

Write-Host ""
Write-Host "SPM Stream Manager Deployment" -ForegroundColor Cyan
Write-Host "Ziel: $Target"
Write-Host "Remote-Ordner: $RemoteDir"
Write-Host ""

if (Test-Path $Archive) {
  Remove-Item $Archive -Force
}

$Items = @(
  "README.md",
  "Dockerfile",
  "docker-compose.example.yml",
  "env.example",
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
  throw "scp ist fehlgeschlagen. Bitte Target prüfen, z. B. torsten@10.10.100.xxx"
}

$RemoteCommand = @"
set -e
mkdir -p '$RemoteDir'
tar -xzf $RemoteArchive -C '$RemoteDir'
rm -f $RemoteArchive
echo 'Deployment fertig: $RemoteDir'
echo 'Nächster Schritt: cd $RemoteDir && cp env.example .env && nano .env'
"@

Write-Host "Entpacke auf dem Linux-Host..."
ssh $Target $RemoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "ssh/Remote-Entpacken ist fehlgeschlagen. Bitte SSH-Zugriff prüfen."
}

Write-Host ""
Write-Host "Fertig. Danach auf dem Host:"
Write-Host "cd $RemoteDir"
Write-Host "cp env.example .env"
Write-Host "nano .env"
Write-Host "docker compose -f docker-compose.example.yml up -d --build"
