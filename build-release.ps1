# N8NPlus v1.0.4 Build Script for Windows
# This script builds N8NPlus for distribution

Write-Host "🚀 N8NPlus v1.0.4 Build Script" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Node.js is installed
Write-Status "Checking Node.js installation..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
} catch {
    Write-Error "npm is not installed. Please install npm and try again."
    exit 1
}

# Clean previous builds
Write-Status "Cleaning previous builds..."
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "frontend\build") { Remove-Item -Recurse -Force "frontend\build" }
Write-Success "Previous builds cleaned"

# Install root dependencies
Write-Status "Installing root dependencies..."
try {
    npm install
    Write-Success "Root dependencies installed"
} catch {
    Write-Error "Failed to install root dependencies"
    exit 1
}

# Install backend dependencies
Write-Status "Installing backend dependencies..."
try {
    Set-Location "backend"
    npm install
    Write-Success "Backend dependencies installed"
    Set-Location ".."
} catch {
    Write-Error "Failed to install backend dependencies"
    Set-Location ".."
    exit 1
}

# Install frontend dependencies
Write-Status "Installing frontend dependencies..."
try {
    Set-Location "frontend"
    npm install
    Write-Success "Frontend dependencies installed"
    
    # Build frontend
    Write-Status "Building frontend..."
    npm run build
    Write-Success "Frontend built successfully"
    Set-Location ".."
} catch {
    Write-Error "Failed to install/build frontend"
    Set-Location ".."
    exit 1
}

# Check electron-builder
Write-Status "Checking electron-builder..."
try {
    npm list electron-builder --depth=0 | Out-Null
} catch {
    Write-Status "Installing electron-builder..."
    npm install --save-dev electron-builder
}

# Build for Windows
Write-Status "Building for Windows..."
try {
    npm run build-win
    Write-Success "Windows build completed!"
    Write-Status "Output: dist\N8NPlus-1.0.4-win.exe"
} catch {
    Write-Error "Windows build failed"
    exit 1
}

# Show build results
Write-Success "🎉 Build process completed!" -ForegroundColor Green
Write-Host ""
Write-Status "Built files:"
if (Test-Path "dist") {
    Get-ChildItem "dist" | Format-Table Name, Length, LastWriteTime
} else {
    Write-Warning "dist\ directory not found"
}

Write-Host ""
Write-Status "Next steps:"
Write-Host "1. Test the built application"
Write-Host "2. Upload to GitHub release"
Write-Host "3. Update release notes"

Write-Success "✅ Ready for distribution!" -ForegroundColor Green

# Pause to keep window open
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
