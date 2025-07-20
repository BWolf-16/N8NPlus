@echo off
title N8NPlus - Simple Startup
echo Starting N8NPlus with available ports...

echo Finding available backend port...
for %%p in (8001 8002 8003 8004 8005) do (
    netstat -an | find ":%%p " >nul
    if errorlevel 1 (
        echo Using backend port %%p
        set BACKEND_PORT=%%p
        goto :frontend
    )
)

:frontend
echo Finding available frontend port...
for %%p in (3001 3002 3003 3004 3005) do (
    netstat -an | find ":%%p " >nul
    if errorlevel 1 (
        echo Using frontend port %%p
        set FRONTEND_PORT=%%p
        goto :start
    )
)

:start
echo Starting backend on port %BACKEND_PORT%...
start "Backend" cmd /k "cd /d %~dp0backend && set BACKEND_PORT=%BACKEND_PORT% && node index.js"

timeout /t 3 /nobreak >nul

echo Starting frontend on port %FRONTEND_PORT%...
start "Frontend" cmd /k "cd /d %~dp0frontend && set PORT=%FRONTEND_PORT% && node start-with-port.js"

timeout /t 5 /nobreak >nul

echo Starting Electron...
npx electron .

pause
