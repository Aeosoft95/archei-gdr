@echo off
title ARCHEI Companion - Local Start
cd /d %~dp0

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
  echo pnpm non trovato. Installo pnpm...
  npm install -g pnpm
)

if not exist ".env.local" (
  copy .env.local.example .env.local >nul
)

echo Installazione dipendenze...
pnpm install

echo Avvio WS (porta 8787)...
start "WS Server" cmd /k pnpm dev:ws

echo Avvio Web (porta 3000, host 0.0.0.0)...
pnpm dev:web
