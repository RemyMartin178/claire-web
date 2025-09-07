@echo off
echo ========================================
echo   Lancement Glass App avec Auth & AI
echo ========================================

cd /d "%~dp0\dist\win-unpacked"

REM Chargement des variables d'environnement depuis .env
if exist "%~dp0..\.env" (
    echo Chargement des variables d'environnement depuis .env...
    for /f "tokens=*" %%a in (%~dp0..\.env) do (
        set %%a
    )
    echo Variables d'environnement chargées.
) else (
    echo ATTENTION: Fichier .env non trouvé
    echo Les fonctionnalités AI pourraient ne pas fonctionner.
)

REM Configuration des variables d'environnement
set PENDING_SESSIONS_DB_PATH=%APPDATA%\Glass\pending_sessions.sqlite
set GOOGLE_APPLICATION_CREDENTIALS=%~dp0resources\dedale-database-23102cfe0ceb.json
set ELECTRON_ENABLE_LOGGING=1

echo.
echo Configuration:
echo PENDING_SESSIONS_DB_PATH: %PENDING_SESSIONS_DB_PATH%
echo GOOGLE_APPLICATION_CREDENTIALS: %GOOGLE_APPLICATION_CREDENTIALS%
if defined OPENAI_API_KEY (
    echo OPENAI_API_KEY: Configuré
) else (
    echo OPENAI_API_KEY: Non configuré
)
echo.

REM Copier le fichier de credentials s'il n'existe pas déjà
if not exist "resources\dedale-database-23102cfe0ceb.json" (
    echo Copie du fichier de credentials Firebase...
    copy "%~dp0dedale-database-23102cfe0ceb.json" "resources\" >nul 2>&1
    if errorlevel 1 (
        echo ATTENTION: Impossible de copier le fichier de credentials
        echo L'authentification pourrait ne pas fonctionner
    )
)

echo.
echo Lancement de l'application...
Glass.exe --enable-logging --v=1

pause
