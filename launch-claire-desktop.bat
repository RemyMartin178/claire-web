@echo off
REM Lancer Claire depuis le raccourci Bureau avec les variables Firebase

REM Firebase Web SDK config
set NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho
set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.clairia.app
set NEXT_PUBLIC_FIREBASE_PROJECT_ID=dedale-database
set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dedale-database.appspot.com
set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=100635676468
set NEXT_PUBLIC_FIREBASE_APP_ID=1:100635676468:web:46fdecfad3133fef4b5f61

REM Production URLs
set pickleglass_API_URL=https://claire-web-production.up.railway.app
set pickleglass_WEB_URL=https://app.clairia.app
set NODE_ENV=production

REM Lancer depuis le Bureau
start "" "%USERPROFILE%\Desktop\Claire.lnk"

