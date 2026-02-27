@echo off
echo =======================================================
echo Lancement de Claire en mode PRODUCTION avec logs...
echo =======================================================
echo.
echo Gardez cette fenetre ouverte pour voir les logs du script de dechiffrement.
echo.

set ELECTRON_ENABLE_LOGGING=1
set NODE_ENV=production

cd dist\win-unpacked
ClaireApp.exe
