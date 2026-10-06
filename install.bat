@echo off
setlocal
set "DEST=C:\Users\Gebruiker\Desktop\midea-app"
set "SITE=%DEST%\mvfunderingsscan"
if not exist "%DEST%" (
  echo FOUT: projectmap niet gevonden op %DEST%
  pause
  exit /b 1
)
echo Bestanden kopieren naar %SITE% ...
xcopy /E /I /Y /H "%~dp0files" "%DEST%"
echo.
echo Klaar: 128 pagina's, 24 gemeenten, werkende formulieren (api/aanvraag.js).
echo Lees docs\livegang-checklist.md voor Resend, Vercel en Search Console.
echo.
echo Starten:
echo   cd /d %SITE%
echo   npm install
echo   npm run dev
echo.
echo Geen SQL nodig.
pause
