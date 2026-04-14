@echo off
echo Lancement de Claire avec logs...
echo.

REM Chercher l'installation de Claire
set CLAIRE_INSTALLED=%LOCALAPPDATA%\Programs\Claire\Claire.exe
set CLAIRE_DIST=%~dp0dist\win-unpacked\Claire.exe

if exist "%CLAIRE_INSTALLED%" (
    echo Lancement depuis: %CLAIRE_INSTALLED%
    "%CLAIRE_INSTALLED%" 2>&1
) else if exist "%CLAIRE_DIST%" (
    echo Lancement depuis: %CLAIRE_DIST%
    "%CLAIRE_DIST%" 2>&1
) else (
    echo ERREUR: Claire introuvable !
    echo Cherche dans: %CLAIRE_INSTALLED%
    echo Ou dans: %CLAIRE_DIST%
    pause
    exit /b 1
)

pause

