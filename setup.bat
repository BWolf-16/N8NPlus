@echo off
echo.
echo ========================================
echo   N8NPlus Auto-Setup Script
echo ========================================
echo.

echo 🚀 Starting N8NPlus setup...
echo.

REM Check if Node.js is installed
echo 🔍 Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first:
    echo    👉 https://nodejs.org/en/download/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check if npm is installed
echo 🔍 Checking for npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
) else (
    echo ✅ npm found
)

echo.
echo 📦 Running full setup...
echo.

REM Run the setup manager
npm run setup

if %errorlevel% neq 0 (
    echo.
    echo ❌ Setup failed. Please check the error messages above.
    echo    You can also try running: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 🎉 You can now run N8NPlus with: npm start
echo.

REM Ask if user wants to start the application
set /p start="Would you like to start N8NPlus now? (y/n): "
if /i "%start%"=="y" (
    echo.
    echo 🚀 Starting N8NPlus...
    npm start
) else (
    echo.
    echo 👍 Setup complete. Run 'npm start' when you're ready to use N8NPlus.
)

pause
