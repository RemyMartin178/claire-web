@echo off
title Claire — Debug Deeplink
color 0A
echo ============================================================
echo  Claire — Debug Deeplink
echo  Surveille les logs pour diagnostiquer l'auth deeplink
echo ============================================================
echo.
echo [1] Lance l'app (logs visibles dans cette fenetre)
echo [2] Lance l'app + simule un deeplink test apres 20s
echo [3] Simule uniquement un deeplink (app deja ouverte)
echo.
set /p choix="Choix (1/2/3) : "

if "%choix%"=="3" goto deeplink_only
if "%choix%"=="2" goto launch_and_test
goto launch_only

:launch_only
echo.
echo Lancement de Claire avec logs...
echo Effectue le flow auth, puis surveille les lignes :
echo   [Protocol] Second instance detected
echo   [deeplink] AUTH ACTION DETECTED
echo   [Auth] Received ID token
echo   [AuthService] Broadcasting user state change
echo.
npm start
goto end

:launch_and_test
echo.
echo Lancement de Claire...
start "Claire App" cmd /k "npm start"
echo Attente 20 secondes avant de simuler le deeplink...
timeout /t 20 /nobreak >nul
echo.
echo Simulation deeplink claire://auth-success (sans token — test de reception)
start "" "claire://auth-success?token=TEST_TOKEN_DEBUG"
echo.
echo Verifie dans la fenetre Claire si "[Protocol] Second instance detected" apparait.
echo Si non : la registration du protocole a echoue.
goto end

:deeplink_only
echo.
echo Simulation deeplink claire://auth-success...
start "" "claire://auth-success?token=TEST_TOKEN_DEBUG"
echo Verifie les logs de la fenetre Claire.

:end
pause
