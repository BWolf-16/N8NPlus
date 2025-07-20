@echo off
setlocal enabledelayedexpansion
title N8NPlus - Port-Safe Startup
color 0A

echo ==========================================
echo    N8NPlus - Docker n8n Container Manager
echo    Port-Safe Startup (v1.1)
echo ==========================================
echo.

:: Kill any existing processes
echo [1/6] Cleaning up existing processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
echo ✓ Cleanup complete
echo.

:: Find available backend port
echo [2/6] Finding available backend port...
set BACKEND_PORT=
for %%p in (8001 8002 8003 8004 8005 8006 8007 8008) do (
    netstat -an | find ":%%p " >nul 2>&1
    if errorlevel 1 (
        set BACKEND_PORT=%%p
        echo ✓ Selected backend port: %%p
        goto :frontend_port
    )
)
echo ❌ Could not find available backend port
pause
exit /b 1

:frontend_port
:: Find available frontend port
echo [3/6] Finding available frontend port...
set FRONTEND_PORT=
for %%p in (3001 3002 3003 3004 3005 3006 3007 3008) do (
    netstat -an | find ":%%p " >nul 2>&1
    if errorlevel 1 (
        set FRONTEND_PORT=%%p
        echo ✓ Selected frontend port: %%p
        goto :start_backend
    )
)
echo ❌ Could not find available frontend port
pause
exit /b 1

:start_backend
echo [4/6] Starting backend server...
echo Command: cd backend ^&^& set BACKEND_PORT=!BACKEND_PORT! ^&^& node index.js
start "N8NPlus Backend (Port !BACKEND_PORT!)" cmd /k "cd /d \"%~dp0backend\" && set BACKEND_PORT=!BACKEND_PORT! && echo Starting backend on port !BACKEND_PORT!... && node index.js"
echo ✓ Backend server starting in new window (Port !BACKEND_PORT!)
echo.

echo [5/6] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo [6/6] Starting frontend server...
echo Command: cd frontend ^&^& set PORT=!FRONTEND_PORT! ^&^& node start-with-port.js
start "N8NPlus Frontend (Port !FRONTEND_PORT!)" cmd /k "cd /d \"%~dp0frontend\" && set PORT=!FRONTEND_PORT! && echo Starting frontend on port !FRONTEND_PORT!... && node start-with-port.js"
echo ✓ Frontend server starting in new window (Port !FRONTEND_PORT!)
echo.

echo [7/7] Waiting for frontend to initialize...
timeout /t 8 /nobreak >nul

echo [8/8] Starting Electron application...
echo ✓ Launching Electron with:
echo   - Backend:  http://localhost:!BACKEND_PORT!
echo   - Frontend: http://localhost:!FRONTEND_PORT!
echo.
npx electron .

echo.
echo ==========================================
echo All components started successfully!
echo.
echo Backend:  http://localhost:!BACKEND_PORT!
echo Frontend: http://localhost:!FRONTEND_PORT!
echo.
echo Check the separate terminal windows for server logs.
echo Press any key to exit...
pause >nul
