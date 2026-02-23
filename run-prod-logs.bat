@echo off
echo Lancement de l'application Claire en mode production avec logs...
echo.

rem Variables d'environnement pour activer un maximum de logs dans Electron et Node
set ELECTRON_ENABLE_LOGGING=1
set DEBUG=*
set NODE_ENV=production

rem On lance le binaire compiler au lieu de passer par npm
rem L'exécutable généré devrait se trouver dans dist/win-unpacked
set APP_PATH="%~dp0dist\win-unpacked\ClaireApp.exe"

if not exist %APP_PATH% (
    echo [ERREUR] L'executable %APP_PATH% n'a pas ete trouve.
    echo Avez-vous bien execute "npm run build:win" ou l'installateur ?
    pause
    exit /b 1
)

echo Execution de: %APP_PATH%
echo Les logs vont s'afficher ci-dessous. Fermez l'application pour arreter ce script.
echo -------------------------------------------------------------------------------
%APP_PATH%

echo.
echo -------------------------------------------------------------------------------
echo Application fermee.
pause
