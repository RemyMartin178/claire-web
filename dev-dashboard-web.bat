@echo off
setlocal

cd /d "%~dp0"

echo Starting pickleglass_web on http://localhost:3000 ...
start "pickleglass_web" cmd /k "cd /d \"%~dp0pickleglass_web\" && npm run dev"

echo Waiting for the local dashboard to be ready...
call "%~dp0node_modules\.bin\wait-on.cmd" http://localhost:3000

echo Starting Electron with pickleglass_web as dashboard...
call npm run start:dashboard
