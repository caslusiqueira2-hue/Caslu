@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22 ou mais recente para iniciar o Nutra.
  pause
  exit /b 1
)
start "Nutra - servidor local" cmd /k node server.mjs
timeout /t 2 /nobreak >nul
start "" "http://localhost:3210"
