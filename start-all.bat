@echo off
title N8NPlus - Complete Startup
color 0A

echo ==========================================
echo    N8NPlus - Docker n8n Container Manager
echo    Complete Startup Script
echo ==========================================
echo.

echo [1/4] Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is available
echo.

echo [2/4] Starting Backend Server...
start "N8NPlus Backend" cmd /k "cd /d \"%~dp0backend\" && echo Starting backend server... && node index.js"
echo ✓ Backend server started in new window
echo.

echo [3/4] Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul
echo.

echo [4/4] Starting Frontend Server...
start "N8NPlus Frontend" cmd /k "cd /d \"%~dp0frontend\" && echo Starting frontend server... && node start-with-port.js"
echo ✓ Frontend server started in new window
echo.

echo [5/5] Waiting 10 seconds for frontend to initialize...
timeout /t 10 /nobreak >nul
echo.

echo [6/6] Starting Electron App...
echo ✓ Launching Electron application...
npx electron .

echo.
echo All components started!
echo - Backend server is running in its own window
echo - Frontend server is running in its own window  
echo - Electron app should now be visible
echo.
echo Press any key to exit this startup script...
pause >nul
