#!/usr/bin/env powershell

# N8NPlus v1.0.4 Release Deployment Script
# This script prepares all files for GitHub release upload

Write-Host "🚀 Preparing N8NPlus v1.0.4 Release Package..." -ForegroundColor Green

# Define paths
$projectRoot = "c:\Users\bened\Main\N8NPlus"
$distPath = "$projectRoot\dist"
$releasePath = "$projectRoot\release-v1.0.4"

# Create release directory
Write-Host "📁 Creating release directory..." -ForegroundColor Yellow
if (Test-Path $releasePath) {
    Remove-Item $releasePath -Recurse -Force
}
New-Item -ItemType Directory -Path $releasePath | Out-Null

# Copy main installer
Write-Host "📦 Copying installer..." -ForegroundColor Yellow
Copy-Item "$distPath\N8NPlus Setup 1.0.4.exe" "$releasePath\"

# Copy auto-update files
Write-Host "🔄 Copying auto-update files..." -ForegroundColor Yellow
Copy-Item "$distPath\latest.yml" "$releasePath\"
Copy-Item "$distPath\N8NPlus Setup 1.0.4.exe.blockmap" "$releasePath\"

# Copy documentation
Write-Host "📚 Copying documentation..." -ForegroundColor Yellow
Copy-Item "$projectRoot\RELEASE_NOTES_v1.0.4.md" "$releasePath\"
Copy-Item "$projectRoot\INSTALLATION_GUIDE_v1.0.4.md" "$releasePath\"
Copy-Item "$projectRoot\CHECKSUMS_v1.0.4.md" "$releasePath\"
Copy-Item "$projectRoot\README.md" "$releasePath\"
Copy-Item "$projectRoot\CHANGELOG.md" "$releasePath\"

# Create GitHub release template
Write-Host "📝 Creating GitHub release template..." -ForegroundColor Yellow
$releaseTemplate = @"
# N8NPlus v1.0.4 - Self-Contained Application Release

🎉 **Major Release: Automatic Startup with Bundled Dependencies**

## 🚀 Quick Download

**Main Installer**: [N8NPlus Setup 1.0.4.exe](https://github.com/BWolf-16/N8NPlus/releases/download/v1.0.4/N8NPlus%20Setup%201.0.4.exe) (95.77 MB)

## ✨ Key Features

- **🔄 Automatic Startup**: No more batch files! Single click starts everything
- **📦 Self-Contained**: Node.js v20.11.0 bundled - no separate installation needed
- **🎯 Smart Port Management**: Automatic port detection and conflict resolution
- **🐳 Docker Integration**: Seamless container management
- **🔧 Enhanced Reliability**: Progressive execution strategies and error handling

## 📋 What's Included

- ✅ N8NPlus Electron Application
- ✅ Node.js v20.11.0 Runtime (bundled)
- ✅ Frontend React Application (pre-built)
- ✅ Backend Express Server
- ✅ Docker Integration Layer
- ✅ Automatic Startup System
- ✅ Smart Port Management
- ✅ Enhanced Error Handling

## 🛠️ Installation

1. Download `N8NPlus Setup 1.0.4.exe`
2. Run the installer (Windows will verify the digital signature)
3. Follow the installation wizard
4. Launch N8NPlus from desktop shortcut
5. Everything starts automatically!

## 📖 Documentation

- **[📚 Installation Guide](https://github.com/BWolf-16/N8NPlus/releases/download/v1.0.4/INSTALLATION_GUIDE_v1.0.4.md)**: Detailed setup instructions
- **[📝 Release Notes](https://github.com/BWolf-16/N8NPlus/releases/download/v1.0.4/RELEASE_NOTES_v1.0.4.md)**: Complete feature breakdown
- **[🔐 Checksums](https://github.com/BWolf-16/N8NPlus/releases/download/v1.0.4/CHECKSUMS_v1.0.4.md)**: File verification

## 🔍 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB + space for n8n data
- **Docker**: Docker Desktop (auto-detected, installation prompted)

## 🔐 File Verification

**SHA256**: `69477F4E6C75853EE35A9C178D5043B9586EBB1B712094A0905D3C4B175D4515`
**MD5**: `9B6D5A3E44C010CF12D1E23066C93774`

## 🆕 What's New in v1.0.4

### Automatic Startup Revolution
- **Before**: Manual batch file execution required
- **After**: Single click launches entire application stack
- Smart service detection and automatic port allocation
- Real-time status indicators and error handling

### Self-Contained Package
- Node.js v20.11.0 bundled directly in application
- No external dependency installation required
- Progressive fallback strategies for maximum compatibility
- Enhanced installer with dependency detection

### Enhanced Reliability
- Multiple Node.js execution strategies
- Comprehensive error handling and recovery
- Smart port management with conflict resolution
- Improved spawn process management

## 🚀 Quick Start

1. **Download**: Get the installer above
2. **Install**: Run and follow the wizard
3. **Launch**: Click the desktop shortcut
4. **Use**: All services start automatically!

No configuration, no setup, no batch files - just click and run!

---

**Full Documentation**: See attached guides for detailed information
**Support**: Create an issue for questions or problems
**Updates**: Auto-update system included for future releases
"@

$releaseTemplate | Out-File "$releasePath\GITHUB_RELEASE_TEMPLATE.md" -Encoding UTF8

# Generate file listing
Write-Host "📋 Generating file listing..." -ForegroundColor Yellow
$files = Get-ChildItem $releasePath | Select-Object Name, @{Name="Size";Expression={
    if ($_.Length -gt 1MB) {
        "{0:N2} MB" -f ($_.Length / 1MB)
    } elseif ($_.Length -gt 1KB) {
        "{0:N2} KB" -f ($_.Length / 1KB)
    } else {
        "{0} bytes" -f $_.Length
    }
}}

$fileList = @"
# N8NPlus v1.0.4 Release Files

## Files in this Release

| File | Size | Description |
|------|------|-------------|
| N8NPlus Setup 1.0.4.exe | 95.77 MB | Main installer with bundled Node.js |
| latest.yml | < 1 KB | Auto-update configuration |
| N8NPlus Setup 1.0.4.exe.blockmap | < 1 KB | Delta update support |
| RELEASE_NOTES_v1.0.4.md | ~15 KB | Detailed release notes |
| INSTALLATION_GUIDE_v1.0.4.md | ~20 KB | Complete installation guide |
| CHECKSUMS_v1.0.4.md | ~5 KB | File verification checksums |
| README.md | ~10 KB | Project overview |
| CHANGELOG.md | ~8 KB | Version history |
| GITHUB_RELEASE_TEMPLATE.md | ~8 KB | GitHub release description |

## Upload Instructions

### For GitHub Release:

1. Go to: https://github.com/BWolf-16/N8NPlus/releases/new
2. Tag version: `v1.0.4`
3. Release title: `N8NPlus v1.0.4 - Self-Contained Application`
4. Copy description from `GITHUB_RELEASE_TEMPLATE.md`
5. Upload all files from this directory
6. Mark as latest release
7. Publish

### Files to Upload to GitHub Release:
- ✅ N8NPlus Setup 1.0.4.exe (main installer)
- ✅ latest.yml (for auto-updates)
- ✅ N8NPlus Setup 1.0.4.exe.blockmap (for delta updates)
- ✅ INSTALLATION_GUIDE_v1.0.4.md
- ✅ RELEASE_NOTES_v1.0.4.md
- ✅ CHECKSUMS_v1.0.4.md

Total upload size: ~96 MB
"@

$fileList | Out-File "$releasePath\FILE_LIST.md" -Encoding UTF8

# Display summary
Write-Host ""
Write-Host "✅ Release package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Release files location: $releasePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Files ready for upload:" -ForegroundColor Yellow
Get-ChildItem $releasePath | ForEach-Object {
    $size = if ($_.Length -gt 1MB) { "{0:N2} MB" -f ($_.Length / 1MB) } else { "{0:N2} KB" -f ($_.Length / 1KB) }
    Write-Host "   ✓ $($_.Name) ($size)" -ForegroundColor White
}
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Green
Write-Host "   1. Review GITHUB_RELEASE_TEMPLATE.md for release description" -ForegroundColor White
Write-Host "   2. Upload files to GitHub release" -ForegroundColor White
Write-Host "   3. Test the installer on a clean system" -ForegroundColor White
Write-Host ""
Write-Host "📋 Release URL: https://github.com/BWolf-16/N8NPlus/releases/new" -ForegroundColor Cyan
