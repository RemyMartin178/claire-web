@echo off
setlocal enableextensions enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"

echo ========================================
echo   Lancement Glass App avec Auth ^& AI
echo ========================================

REM Load .env from script directory
if exist "%SCRIPT_DIR%.env" (
    echo Chargement des variables d'environnement depuis .env...
    for /f "usebackq tokens=1,* delims== eol=#" %%A in ("%SCRIPT_DIR%.env") do set "%%A=%%B"
    echo Variables d'environnement chargées.
) else (
    echo ATTENTION: Fichier .env non trouvé dans %SCRIPT_DIR%
    echo Les fonctionnalités AI pourraient ne pas fonctionner.
)

REM Configuration
set ELECTRON_ENABLE_LOGGING=1
set ELECTRON_ENABLE_STACK_DUMPING=1

echo.
echo Configuration:
echo SCRIPT_DIR: %SCRIPT_DIR%
if defined OPENAI_API_KEY (
    echo OPENAI_API_KEY: Configuré
) else (
    echo OPENAI_API_KEY: Non configuré
)
echo.

REM Launch the app
if exist "%SCRIPT_DIR%dist\win-unpacked\electron.exe" (
    echo Lancement via electron.exe packagé...
    "%SCRIPT_DIR%dist\win-unpacked\electron.exe" --enable-logging --v=1
) else (
    echo Lancement via npx electron...
    npx electron "%SCRIPT_DIR%" --enable-logging --v=1
)

echo Exit code: %errorlevel%
pause
