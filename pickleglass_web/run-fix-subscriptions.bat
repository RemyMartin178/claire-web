@echo off
echo Correction des abonnements existants...
echo.

cd /d "%~dp0"

REM Charger les variables d'environnement depuis .env.local
if exist .env.local (
    echo Chargement des variables d'environnement...
    for /f "usebackq tokens=1,2 delims==" %%a in (.env.local) do (
        set %%a=%%b
    )
    echo Variables d'environnement chargées.
) else (
    echo Fichier .env.local non trouvé!
    pause
    exit /b 1
)

echo.
echo Lancement de la correction des abonnements...
node fix-existing-subscriptions.js

echo.
echo Script terminé.
pause
