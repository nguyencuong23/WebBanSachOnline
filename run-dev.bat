@echo off
setlocal enabledelayedexpansion

REM Run FE+BE in dev mode with hot reload (Docker only)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker not found. Please install Docker Desktop first.
  exit /b 1
)

if not exist ".env" (
  echo Missing .env in repo root.
  echo Create it from .env.example and fill SUPABASE_* values, then run again.
  exit /b 1
)
findstr /B /C:"SUPABASE_ANON_KEY=sb_publishable_" ".env" >nul
if errorlevel 1 (
  echo SUPABASE_ANON_KEY does not look valid. It must start with sb_publishable_
  start notepad ".env"
  exit /b 1
)
findstr /B /C:"SUPABASE_SERVICE_ROLE_KEY=sb_secret_" ".env" >nul
if errorlevel 1 (
  echo SUPABASE_SERVICE_ROLE_KEY does not look valid. It must start with sb_secret_
  start notepad ".env"
  exit /b 1
)

echo Starting DEV API + DEV Web (hot reload)...
docker compose -f docker-compose.dev.yml up

