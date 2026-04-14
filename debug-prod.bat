@echo off
setlocal enableextensions
set "DIR=%~dp0"

echo ========================================
echo   Claire - Debug Production
echo ========================================
echo.

REM Chercher Claire.exe dans les chemins possibles
set "EXE="
if exist "%DIR%dist\win-unpacked\Claire.exe"     set "EXE=%DIR%dist\win-unpacked\Claire.exe"
if exist "%DIR%dist-out\win-unpacked\Claire.exe" set "EXE=%DIR%dist-out\win-unpacked\Claire.exe"
if exist "%DIR%release\win-unpacked\Claire.exe"  set "EXE=%DIR%release\win-unpacked\Claire.exe"

REM Chercher aussi dans %LOCALAPPDATA% si installé via NSIS
if not defined EXE (
    if exist "%LOCALAPPDATA%\Programs\Claire\Claire.exe" set "EXE=%LOCALAPPDATA%\Programs\Claire\Claire.exe"
)

if not defined EXE (
    echo [ERREUR] Claire.exe introuvable.
    echo Chemins testés :
    echo   %DIR%dist\win-unpacked\Claire.exe
    echo   %DIR%dist-out\win-unpacked\Claire.exe
    echo   %DIR%release\win-unpacked\Claire.exe
    echo   %LOCALAPPDATA%\Programs\Claire\Claire.exe
    echo.
    echo Buildez d'abord : npm run dist
    pause
    exit /b 1
)

echo Executable: %EXE%
echo.

REM Fichier de log horodaté
set "LOGFILE=%DIR%prod-debug-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%.log"
set "LOGFILE=%LOGFILE: =0%"

echo Log fichier: %LOGFILE%
echo.
echo ========================================
echo  LOGS EN DIRECT (aussi sauvés dans le fichier ci-dessus)
echo ========================================
echo.

REM Activer tous les logs Electron + Chromium
set ELECTRON_ENABLE_LOGGING=1
set DEBUG=*
set NODE_ENV=production

REM Ouvrir une 2eme fenetre qui affiche les logs en temps reel (tail -f style)
start "Claire Logs (live)" powershell -NoExit -Command "Get-Content -Path '%LOGFILE%' -Wait"

REM Lancer l'app en redirigeant stdout+stderr vers le fichier log
"%EXE%" --enable-logging --log-level=0 > "%LOGFILE%" 2>&1

echo.
echo ========================================
echo  Application fermée
echo  Log sauvé dans: %LOGFILE%
echo ========================================
pause
