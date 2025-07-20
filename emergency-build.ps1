Write-Host "🚀 N8NPlus v1.0.4 Emergency Build Script" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Clean dist folder
if (Test-Path "dist") {
    Write-Host "[INFO] Cleaning dist folder..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force "dist"
    Write-Host "[SUCCESS] Cleaned dist folder" -ForegroundColor Green
}

# Check if frontend is built
if (-not (Test-Path "frontend\build")) {
    Write-Host "[INFO] Building frontend first..." -ForegroundColor Cyan
    Set-Location "frontend"
    npm run build
    Set-Location ".."
    Write-Host "[SUCCESS] Frontend built" -ForegroundColor Green
}

# Try multiple build approaches
Write-Host "[INFO] Attempting to build N8NPlus..." -ForegroundColor Cyan
Write-Host "[INFO] This may take 5-10 minutes..." -ForegroundColor Yellow

$success = $false

# Approach 1: Local electron-builder
try {
    Write-Host "[INFO] Trying local electron-builder..." -ForegroundColor Cyan
    & ".\node_modules\.bin\electron-builder.cmd" --win --x64
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "[SUCCESS] Build completed with local electron-builder!" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Local electron-builder failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Approach 2: npx
if (-not $success) {
    try {
        Write-Host "[INFO] Trying npx electron-builder..." -ForegroundColor Cyan
        npx electron-builder --win --x64
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "[SUCCESS] Build completed with npx!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARNING] npx approach failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Approach 3: npm script
if (-not $success) {
    try {
        Write-Host "[INFO] Trying npm script..." -ForegroundColor Cyan
        npm run build-win
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "[SUCCESS] Build completed with npm script!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARNING] npm script failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Check results
if (Test-Path "dist") {
    Write-Host "`n[SUCCESS] ✅ Build files created!" -ForegroundColor Green
    Write-Host "[INFO] Built files:" -ForegroundColor Cyan
    Get-ChildItem "dist" | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  📦 $($_.Name) ($sizeMB MB)" -ForegroundColor White
    }
    Write-Host "`n[INFO] 🎉 Ready for GitHub upload!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] ❌ Build failed - no dist folder created" -ForegroundColor Red
    Write-Host "[INFO] Manual steps to try:" -ForegroundColor Yellow
    Write-Host "1. npm install" -ForegroundColor White
    Write-Host "2. cd frontend && npm install && npm run build && cd .." -ForegroundColor White
    Write-Host "3. npx electron-builder --win" -ForegroundColor White
}

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
