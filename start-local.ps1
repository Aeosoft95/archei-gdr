# ARCHEI Companion - Avvio locale PowerShell
param([switch]$InstallPnpm)

Set-Location -Path $PSScriptRoot

if ($InstallPnpm -or -not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  npm install -g pnpm
}

if (-not (Test-Path .env.local)) {
  Copy-Item .env.local.example .env.local
}

pnpm install

Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "dev:ws"
pnpm dev:web
