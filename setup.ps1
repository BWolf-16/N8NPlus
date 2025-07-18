# N8NPlus Auto-Setup Script (PowerShell)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   N8NPlus Auto-Setup Script" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting N8NPlus setup..." -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    try {
        Get-Command $cmdname -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Check if Node.js is installed
Write-Host "🔍 Checking for Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js first:" -ForegroundColor Red
    Write-Host "    👉 https://nodejs.org/en/download/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
Write-Host "🔍 Checking for npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📦 Running full setup..." -ForegroundColor Blue
Write-Host ""

# Run the setup manager
try {
    npm run setup
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 You can now run N8NPlus with: npm start" -ForegroundColor Cyan
        Write-Host ""
        
        # Ask if user wants to start the application
        $start = Read-Host "Would you like to start N8NPlus now? (y/n)"
        if ($start -eq "y" -or $start -eq "Y") {
            Write-Host ""
            Write-Host "🚀 Starting N8NPlus..." -ForegroundColor Green
            npm start
        } else {
            Write-Host ""
            Write-Host "👍 Setup complete. Run 'npm start' when you're ready to use N8NPlus." -ForegroundColor Green
        }
    } else {
        throw "Setup failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Setup failed. Error: $_" -ForegroundColor Red
    Write-Host "    You can also try running: npm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"
