$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "=== BOT Jodita: setup ==="
Write-Host ""

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Cree el archivo .env desde .env.example."
  Write-Host "Abrilo y completá TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID y OPENAI_API_KEY si vas a usar IA."
  Write-Host ""
}

$NodeExe = "C:\Program Files\nodejs\node.exe"
$NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"

if (-not (Test-Path $NodeExe)) {
  $NodeExe = "node"
}

if (Test-Path $NpmCli) {
  Write-Host "Instalando dependencias con npm..."
  & $NodeExe $NpmCli install
} else {
  Write-Host "Instalando dependencias con npm del sistema..."
  npm install
}

Write-Host ""
Write-Host "Setup terminado."
Write-Host "Siguiente paso: completá .env y ejecutá .\start-bot-jodita.ps1"
Write-Host ""

