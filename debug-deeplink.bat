@echo off
title Claire — Debug Deeplink
color 0A
echo ============================================================
echo  Claire — Debug Deeplink
echo  Teste la reception du deeplink pickleglass://auth/callback
echo ============================================================
echo.
echo [1] Lancer Claire avec logs (faire le flow auth complet)
echo [2] Simuler un deeplink pickleglass:// (app deja ouverte)
echo.
set /p choix="Choix (1/2) : "

if "%choix%"=="2" goto deeplink_only

:launch_only
echo.
echo Lancement de Claire...
echo.
echo Surveille ces lignes dans la console :
echo   [Protocol] pickleglass:// registration: OK
echo   [Protocol] Second instance detected
echo   DEEPLINK INTERCEPTED!
echo   STARTING MOBILE AUTH CALLBACK
echo   [AuthService] Broadcasting user state change
echo.
npm start
goto end

:deeplink_only
echo.
echo Simulation deeplink pickleglass://auth/callback...
echo (teste uniquement la reception - le token sera invalide)
start "" "pickleglass://auth/callback?code=TEST_SESSION_DEBUG&state=st-teststate"
echo.
echo Verifie dans les logs si "DEEPLINK INTERCEPTED!" apparait.
echo Si non : la registration du protocole a echoue (relance npm start).

:end
pause
