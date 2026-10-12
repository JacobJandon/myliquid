@echo off
rem Double-click on Windows: installs what is needed and shows a QR code. Scan it with your iPhone camera to
rem open MyLiquid in Expo Go (free on the App Store). Needs Node.js from nodejs.org. Close this window to stop.
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org, then double-click this file again. & pause & exit /b 1)
call npm install --no-audit --no-fund
call npx expo start --tunnel --go
pause
