@echo off
echo 🚀 N8NPlus Node.js Bundler (Simple Version)
echo ============================================

REM Check if Node.js is already bundled
if exist "node\node.exe" (
    echo ✅ Node.js already bundled
    exit /b 0
)

echo 📦 Creating node directory...
if not exist "node" mkdir node

echo 📥 Please download Node.js manually from:
echo https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
echo.
echo 📝 Extract the contents to the 'node' folder in this directory
echo.
echo ⚠️ Alternatively, run this as administrator to auto-download

pause
