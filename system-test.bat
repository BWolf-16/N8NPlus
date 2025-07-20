@echo off
echo N8NPlus System Test
echo ===================
echo.

echo [1] Node.js Test:
node --version
if errorlevel 1 (
    echo ❌ Node.js not found
    goto :end
) else (
    echo ✓ Node.js available
)
echo.

echo [2] Dependencies Test:
if exist "backend\package.json" (
    echo ✓ Backend package.json found
) else (
    echo ❌ Backend package.json missing
)

if exist "frontend\package.json" (
    echo ✓ Frontend package.json found
) else (
    echo ❌ Frontend package.json missing
)

if exist "backend\node_modules" (
    echo ✓ Backend dependencies installed
) else (
    echo ⚠️  Backend dependencies may need installation
    echo Run: cd backend ^&^& npm install
)

if exist "frontend\node_modules" (
    echo ✓ Frontend dependencies installed
) else (
    echo ⚠️  Frontend dependencies may need installation
    echo Run: cd frontend ^&^& npm install
)
echo.

echo [3] Port Availability Test:
for %%p in (8001 8002 8003) do (
    netstat -an | find ":%%p " >nul 2>&1
    if errorlevel 1 (
        echo ✓ Port %%p available
    ) else (
        echo ❌ Port %%p in use
    )
)
echo.

echo [4] Files Test:
if exist "main.js" (
    echo ✓ Electron main.js found
) else (
    echo ❌ Electron main.js missing
)

if exist "start-safe.bat" (
    echo ✓ Safe startup script found
) else (
    echo ❌ Safe startup script missing
)
echo.

:end
echo Test complete! 
echo.
echo To start N8NPlus, run: start-safe.bat
pause
