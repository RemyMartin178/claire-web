@echo off
echo ========================================
echo  Lancement de Claire en mode DEBUG
echo ========================================
echo.

REM Définir les variables d'environnement pour activer les logs
set ELECTRON_ENABLE_LOGGING=1
set DEBUG=*
set NODE_ENV=production

REM Chemin vers l'exécutable Claire
set CLAIRE_PATH="%~dp0dist\win-unpacked\Claire.exe"

echo Demarrage de Claire avec logs actives...
echo Chemin: %CLAIRE_PATH%
echo.
echo ========================================
echo  LOGS DE L'APPLICATION
echo ========================================
echo.

REM Lancer Claire et garder la fenêtre ouverte
%CLAIRE_PATH%

echo.
echo ========================================
echo  Application fermee
echo ========================================
pause

