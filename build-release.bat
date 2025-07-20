@echo off
echo 🚀 N8NPlus v1.0.4 Build Script
echo ================================

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js and npm are installed

REM Clean previous builds
echo [INFO] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "frontend\build" rmdir /s /q "frontend\build"
echo [SUCCESS] Previous builds cleaned

REM Install root dependencies
echo [INFO] Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Root dependencies installed

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Backend dependencies installed

REM Install frontend dependencies and build
echo [INFO] Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)

echo [INFO] Building frontend...
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build frontend
    cd ..
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Frontend built successfully

REM Build for Windows
echo [INFO] Building for Windows...
npm run build-win
if %errorlevel% neq 0 (
    echo [ERROR] Windows build failed
    pause
    exit /b 1
)

echo [SUCCESS] 🎉 Build process completed!
echo.
echo [INFO] Built files:
if exist "dist" (
    dir dist
) else (
    echo [WARNING] dist\ directory not found
)

echo.
echo [INFO] Next steps:
echo 1. Test the built application
echo 2. Upload to GitHub release
echo 3. Update release notes
echo.
echo [SUCCESS] ✅ Ready for distribution!

pause
