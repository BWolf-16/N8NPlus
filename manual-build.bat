@echo off
echo 🚀 Manual N8NPlus v1.0.4 Build
echo ===============================

echo [INFO] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
echo [SUCCESS] Cleaned dist folder

echo [INFO] Using local electron-builder...
echo [INFO] This may take 5-10 minutes...

REM Use the local electron-builder directly
node_modules\.bin\electron-builder.cmd --win --x64 --config.productName="N8NPlus" --config.appId="com.bwolf16.n8nplus"

if %errorlevel% equ 0 (
    echo [SUCCESS] Build completed!
    echo [INFO] Check the dist/ folder for your files
    if exist "dist" (
        echo [INFO] Built files:
        dir /b "dist"
    )
) else (
    echo [ERROR] Build failed with error level %errorlevel%
    echo [INFO] Trying alternative approach...
    
    REM Try with npx
    npx electron-builder --win --x64
)

echo [INFO] Build process finished
pause
