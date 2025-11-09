@echo off
echo ========================================
echo  Lancement de Claire en mode PRODUCTION
echo ========================================
echo.

REM Définir les URLs de production
set pickleglass_API_URL=https://claire-web-production.up.railway.app
set pickleglass_WEB_URL=https://app.clairia.app

REM Activer les logs
set ELECTRON_ENABLE_LOGGING=1
set DEBUG=*
set NODE_ENV=production

REM Chemin vers l'exécutable Claire
set CLAIRE_PATH="%~dp0dist\win-unpacked\Claire.exe"

echo URLs de production configurees:
echo - Backend API: %pickleglass_API_URL%
echo - Web App: %pickleglass_WEB_URL%
echo.
echo Demarrage de Claire avec logs actives...
echo.
echo ========================================
echo  LOGS DE L'APPLICATION
echo ========================================
echo.

REM Lancer Claire
%CLAIRE_PATH%

echo.
echo ========================================
echo  Application fermee
echo ========================================
pause

