@echo off
title Claire — Debug Deeplink (Prod)
color 0A
echo ============================================================
echo  Claire — Debug Deeplink (mode production)
echo ============================================================
echo.
echo [1] Build rapide + lancer en prod (recommande)
echo [2] Lancer le dernier build sans rebuilder
echo [3] Simuler un deeplink (app deja ouverte)
echo.
set /p choix="Choix (1/2/3) : "

if "%choix%"=="3" goto deeplink_only
if "%choix%"=="2" goto launch_prod

:build_and_launch
echo.
echo [1/2] Build UI...
call npm run build:ui
if errorlevel 1 ( echo ERREUR build:ui & pause & exit /b 1 )

echo.
echo [2/2] Packaging Electron (unpacked, sans installeur)...
call npx electron-builder --win --x64 --dir --publish never
if errorlevel 1 ( echo ERREUR electron-builder & pause & exit /b 1 )

:launch_prod
echo.
set "EXE=dist\win-unpacked\Claire.exe"
if not exist "%EXE%" (
    echo ERREUR: %EXE% introuvable. Lance le choix 1 d abord.
    pause & exit /b 1
)
echo Lancement prod: %EXE%
echo.
echo Surveille dans la nouvelle fenetre :
echo   [Protocol] pickleglass:// registration: OK
echo   DEEPLINK INTERCEPTED!
echo   STARTING MOBILE AUTH CALLBACK
echo   [AuthService] Broadcasting user state change
echo.
start "Claire Prod" "%EXE%"
goto end

:deeplink_only
echo.
echo Simulation pickleglass://auth/callback...
start "" "pickleglass://auth/callback?code=TEST_SESSION_DEBUG&state=st-teststate"
echo Verifie les logs — DEEPLINK INTERCEPTED! doit apparaitre.

:end
pause
