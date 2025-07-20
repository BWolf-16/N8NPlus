@echo off
echo Testing N8NPlus Components...
echo.

echo [1] Testing Node.js...
node --version
echo.

echo [2] Testing Backend Dependencies...
cd backend
if exist package.json (
    echo ✓ Backend package.json found
) else (
    echo ❌ Backend package.json missing
)
cd ..
echo.

echo [3] Testing Frontend Dependencies...
cd frontend  
if exist package.json (
    echo ✓ Frontend package.json found
) else (
    echo ❌ Frontend package.json missing
)
cd ..
echo.

echo [4] Testing Electron...
if exist main.js (
    echo ✓ Electron main.js found
) else (
    echo ❌ Electron main.js missing
)
echo.

echo [5] Testing Batch Files...
if exist start-all.bat (
    echo ✓ start-all.bat found
) else (
    echo ❌ start-all.bat missing
)
echo.

echo Test complete! You can now try running start-all.bat
pause
