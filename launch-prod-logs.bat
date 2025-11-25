@echo off
setlocal enableextensions
set "SCRIPT_DIR=%~dp0"

REM URLs de production (Railway)
set "pickleglass_API_URL=https://backend-production-ba2c.up.railway.app"
set "pickleglass_WEB_URL=https://app.clairia.app"

echo ========================================
echo   Lancement Claire/Glass (build dist)
echo   Logs console actifs
echo ========================================
echo.

REM Chercher l'exécutable le plus récent dans dist / dist-out
set "TARGET_EXE="
if exist "%SCRIPT_DIR%dist-out\win-unpacked\Glass.exe" (
    set "TARGET_EXE=%SCRIPT_DIR%dist-out\win-unpacked\Glass.exe"
)

if not defined TARGET_EXE (
    if exist "%SCRIPT_DIR%dist\win-unpacked\Glass.exe" (
        set "TARGET_EXE=%SCRIPT_DIR%dist\win-unpacked\Glass.exe"
    )
)

if not defined TARGET_EXE (
    if exist "%SCRIPT_DIR%dist\win-unpacked\Claire.exe" (
        set "TARGET_EXE=%SCRIPT_DIR%dist\win-unpacked\Claire.exe"
    )
)

if not defined TARGET_EXE (
    echo [ERREUR] Aucun exécutable packagé n'a été trouvé.
    echo Construisez d'abord l'application (ex: npm run dist^), puis relancez ce script.
    exit /b 1
)

echo Exécutable détecté :
echo %TARGET_EXE%
echo.
echo ========================================
echo  LOGS EN DIRECT
echo ========================================
echo.

"%TARGET_EXE%" --enable-logging --v=1

echo.
echo ========================================
echo  Application fermée
echo ========================================
pause

