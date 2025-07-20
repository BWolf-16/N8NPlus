Write-Host "Building N8NPlus v1.0.4..." -ForegroundColor Green

# Check if dist folder exists and clean it
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "Cleaned previous build" -ForegroundColor Yellow
}

# Try to run electron-builder
Write-Host "Running electron-builder..." -ForegroundColor Cyan

try {
    & ".\node_modules\.bin\electron-builder.cmd" --win
    Write-Host "Build completed!" -ForegroundColor Green
} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Check the dist folder for output files" -ForegroundColor Blue
