@echo off
echo ========================================
echo  Lancement de Claire en mode PRODUCTION
echo ========================================
echo.

REM Définir les URLs de production
set pickleglass_API_URL=https://claire-web-production.up.railway.app
set pickleglass_WEB_URL=https://app.clairia.app

REM Firebase Web SDK config (REQUIRED) - set your own values here (do NOT commit secrets)
REM Copiez ces valeurs depuis Firebase Console → Project settings → General → Your apps → Web app config
set NEXT_PUBLIC_FIREBASE_API_KEY=REPLACE_ME
set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.clairia.app
set NEXT_PUBLIC_FIREBASE_PROJECT_ID=dedale-database
set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dedale-database.appspot.com
set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=100635676468
set NEXT_PUBLIC_FIREBASE_APP_ID=1:100635676468:web:46fdecfad3133fef4b5f61

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

