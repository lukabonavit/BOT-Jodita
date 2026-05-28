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

function Get-DotEnvValue {
  param(
    [string]$Text,
    [string]$Key
  )

  $Match = [regex]::Match($Text, "(?m)^\s*$Key\s*=\s*(.*)\s*$")
  if (-not $Match.Success) {
    return ""
  }
  return $Match.Groups[1].Value.Trim()
}

$EnvText = Get-Content ".env" -Raw
$TelegramToken = Get-DotEnvValue $EnvText "TELEGRAM_BOT_TOKEN"
$TelegramChatId = Get-DotEnvValue $EnvText "TELEGRAM_CHAT_ID"

if (-not $TelegramToken) {
  Write-Host "Falta TELEGRAM_BOT_TOKEN en .env."
  Write-Host "Sin token, Telegram no puede funcionar. Pegalo desde BotFather y volve a iniciar."
  Write-Host ""
}
elseif (-not $TelegramChatId) {
  Write-Host "TELEGRAM_CHAT_ID esta vacio. Esto es normal en el primer arranque."
  Write-Host "Deja esta terminal abierta, anda a Telegram y mandale /chatid a tu bot."
  Write-Host "Despues copia ese numero en TELEGRAM_CHAT_ID, guarda .env y reinicia."
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
