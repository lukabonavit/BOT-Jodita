$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "=== BOT Jodita: iniciar ==="
Write-Host ""

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Cree el archivo .env."
  Write-Host "Antes de iniciar, abrilo y completá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID."
  Write-Host ""
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "No encontre node_modules. Primero ejecutá:"
  Write-Host ".\setup-bot-jodita.ps1"
  Write-Host ""
  exit 1
}

$EnvText = Get-Content ".env" -Raw
if ($EnvText -match "TELEGRAM_BOT_TOKEN=\s*(\r?\n|$)" -or $EnvText -match "TELEGRAM_CHAT_ID=\s*(\r?\n|$)") {
  Write-Host "Parece que falta completar TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .env."
  Write-Host "El bot puede iniciar, pero no va a mandar alertas a Telegram hasta que eso este completo."
  Write-Host ""
}

$NodeExe = "C:\Program Files\nodejs\node.exe"
$NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"

if (-not (Test-Path $NodeExe)) {
  $NodeExe = "node"
}

if (Test-Path $NpmCli) {
  & $NodeExe $NpmCli run dev
} else {
  npm run dev
}

