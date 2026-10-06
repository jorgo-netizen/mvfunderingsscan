@echo off
chcp 65001 >nul
setlocal
set "DOEL=C:\Users\Gebruiker\Desktop\mvfunderingsscan\mvfunderingsscan"
set "BRON=%~dp0bestanden"
if not exist "%DOEL%\package.json" (
  echo Projectmap niet gevonden: %DOEL%
  pause
  exit /b 1
)
echo Bestanden kopieren naar %DOEL% ...
xcopy "%BRON%\*" "%DOEL%\" /E /Y /I /Q
if errorlevel 1 (
  echo Kopieren mislukt.
  pause
  exit /b 1
)
echo.
echo Klaar. 8 bestanden bijgewerkt (Oldehove-silhouet).
echo Test lokaal: cd /d "%DOEL%" en daarna npm run dev
echo Open http://localhost:3000/kennisbank/loodmeting/
pause
