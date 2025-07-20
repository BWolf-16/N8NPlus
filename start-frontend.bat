@echo off
echo Starting N8NPlus Frontend Server...
cd /d "%~dp0frontend"
node start-with-port.js
pause
