@echo off
setlocal enabledelayedexpansion

REM Run FE+BE using Docker Compose (no local npm needed)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker not found. Please install Docker Desktop first.
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop is not running.
  echo Please open Docker Desktop, wait until it is ready, then run this file again.
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example.
  ) else (
    echo Missing both .env and .env.example.
    exit /b 1
  )
)

findstr /C:"YOUR_PROJECT.supabase.co" ".env" >nul && (
  echo Please update SUPABASE_URL in .env first.
  start notepad ".env"
  exit /b 1
)
findstr /C:"sb_publishable_xxx" ".env" >nul && (
  echo Please update SUPABASE_ANON_KEY in .env first.
  start notepad ".env"
  exit /b 1
)
findstr /C:"sb_secret_xxx" ".env" >nul && (
  echo Please update SUPABASE_SERVICE_ROLE_KEY in .env first.
  start notepad ".env"
  exit /b 1
)
findstr /B /C:"SUPABASE_ANON_KEY=sb_publishable_" ".env" >nul
if errorlevel 1 (
  echo SUPABASE_ANON_KEY does not look valid.
  echo It must start with sb_publishable_
  start notepad ".env"
  exit /b 1
)
findstr /B /C:"SUPABASE_SERVICE_ROLE_KEY=sb_secret_" ".env" >nul
if errorlevel 1 (
  echo SUPABASE_SERVICE_ROLE_KEY does not look valid.
  echo It must start with sb_secret_
  start notepad ".env"
  exit /b 1
)

echo Building and starting API + Web...
docker compose up -d --build
if errorlevel 1 (
  echo Failed to start containers.
  exit /b 1
)

start "Smee Webhook Proxy" cmd /c "echo Dang doi he thong khoi dong... && timeout /t 10 >nul && echo Dang ket noi Webhook... && docker compose exec api npx smee-client -u https://smee.io/umUYvz7hjnV73Z7i -t http://localhost:4000/hooks/sepay-payment"

echo.
echo Started successfully:
echo - Web: http://localhost:8080
echo - API: http://localhost:4000/health
echo.
echo Showing recent logs (Ctrl+C to stop viewing logs)...
docker compose logs -f --tail=80

