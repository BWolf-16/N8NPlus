# N8NPlus v1.0.4 Build Instructions

This guide will help you build N8NPlus v1.0.4 for distribution across all platforms.

## 🛠️ Prerequisites

### Required Software
- **Node.js 18+** (LTS recommended)
- **npm** (comes with Node.js)
- **electron-builder** (will be installed automatically)

### Platform-Specific Requirements
- **Windows**: Windows SDK (for code signing, optional)
- **macOS**: Xcode Command Line Tools
- **Linux**: Standard build tools (`build-essential` on Ubuntu)

## 📦 Build Process

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install Electron builder (if not already installed)
npm install --save-dev electron-builder
```

### 2. Build All Platforms

#### Option A: Build All (if on the target platform)
```bash
# Build for current platform
npm run build

# Or build for all platforms (requires platform-specific tools)
npm run build:all
```

#### Option B: Build Specific Platforms
```bash
# Windows (from Windows or with Wine)
npm run build:win

# macOS (from macOS only)
npm run build:mac

# Linux (from Linux or with Docker)
npm run build:linux
```

### 3. Output Locations
Built files will be in the `dist/` directory:
- **Windows**: `dist/N8NPlus-1.0.4-win.exe`
- **macOS**: `dist/N8NPlus-1.0.4-mac.dmg`
- **Linux**: `dist/N8NPlus-1.0.4-linux.AppImage`

## 🚀 Quick Build Script

Run this script to build everything automatically:

### Windows (PowerShell)
```powershell
# Run build-release.ps1
.\build-release.ps1
```

### macOS/Linux (Bash)
```bash
# Run build-release.sh
chmod +x build-release.sh
./build-release.sh
```

## 📋 Pre-Build Checklist

- [ ] Version updated in `package.json` (should be 1.0.4)
- [ ] Version updated in `loading.html`
- [ ] All dependencies installed
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Clean previous builds: `rm -rf dist/`

## 🔧 Troubleshooting

### Common Issues
1. **electron-builder not found**: Run `npm install --save-dev electron-builder`
2. **Permission errors**: Use `sudo` on macOS/Linux or run as administrator on Windows
3. **Missing dependencies**: Run `npm install` in root, backend, and frontend directories
4. **Code signing errors**: Disable code signing for testing builds

### Build Logs
Check build logs in:
- Windows: `%TEMP%\electron-builder-*.log`
- macOS/Linux: `/tmp/electron-builder-*.log`

## 📤 Upload Preparation

After building, you'll have these files ready for GitHub release:
1. `N8NPlus-1.0.4-win.exe` (Windows installer)
2. `N8NPlus-1.0.4-mac.dmg` (macOS disk image)
3. `N8NPlus-1.0.4-linux.AppImage` (Linux portable)

Upload these to your GitHub release along with:
- Release notes from `GITHUB_RELEASE_v1.0.4.md`
- Changelog from `CHANGELOG.md`
