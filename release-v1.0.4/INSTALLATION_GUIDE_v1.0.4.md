# N8NPlus v1.0.4 Installation Guide

## 🎯 Quick Installation (Recommended)

### Step 1: Download
Download the latest installer: **`N8NPlus Setup 1.0.4.exe`** (95.77 MB)

### Step 2: Run Installer
1. Double-click the downloaded installer
2. Follow the installation wizard
3. Choose installation directory (or use default)
4. The installer will automatically detect and offer to install dependencies

### Step 3: Launch
- Click the desktop shortcut **N8NPlus**
- Or find it in Start Menu → N8NPlus
- The application will start automatically - no batch files needed!

## 🔧 What Happens During Installation

### Automatic Dependency Detection
The installer will check for and offer to install:

#### Node.js Detection
- ✅ **If Node.js is found**: Proceeds with installation
- ❌ **If Node.js is missing**: Offers to download and install Node.js v20.11.0
- 🔄 **Bundled Fallback**: Uses included Node.js v20.11.0 if needed

#### Docker Desktop Detection
- ✅ **If Docker Desktop is found**: Proceeds with installation
- ❌ **If Docker Desktop is missing**: Opens download page and provides instructions
- ⚠️ **Manual Installation**: Docker Desktop requires manual installation and restart

## 🚀 First Run Experience

### Automatic Startup Sequence
When you launch N8NPlus for the first time:

1. **Dependency Check**: Verifies Node.js and Docker availability
2. **Port Allocation**: Automatically selects available ports
   - Backend: 8001-8005 range
   - Frontend: 3001-3005 range
3. **Service Startup**: Starts backend and frontend services
4. **Ready Notification**: Shows when all services are running

### No Configuration Required
- All services start automatically
- Smart port detection prevents conflicts
- Built-in error handling and recovery

## 📁 Installation Structure

### Default Installation Path
```
C:\Program Files\N8NPlus\
├── N8NPlus.exe                 # Main application
├── assets\                     # Icons and resources
├── backend\                    # Backend server files
├── frontend\                   # Frontend application
├── node\                       # Bundled Node.js v20.11.0
├── src\                        # Core application files
└── resources\                  # Electron resources
```

### User Data Location
```
%APPDATA%\N8NPlus\
├── app-preferences.json        # Application preferences
├── port-preferences.json       # Port configuration
└── logs\                       # Application logs
```

## 🐳 Docker Setup

### Automatic Detection
N8NPlus will automatically detect if Docker Desktop is running:
- ✅ **Running**: Shows green status indicator
- ⚠️ **Stopped**: Shows warning with restart instructions
- ❌ **Missing**: Shows installation instructions

### Manual Docker Installation
If Docker Desktop is not installed:

1. **Download**: Visit https://www.docker.com/products/docker-desktop/
2. **Install**: Run the Docker Desktop installer
3. **Restart**: Restart your computer after installation
4. **Launch**: Start Docker Desktop
5. **Verify**: Restart N8NPlus to verify detection

## 🔍 Troubleshooting

### Common Issues and Solutions

#### "Node.js not found" Error
**Solution**: 
1. The bundled Node.js v20.11.0 should automatically work
2. If issues persist, install Node.js manually from https://nodejs.org/
3. Restart N8NPlus after installation

#### Port Conflicts
**Solution**:
- N8NPlus automatically detects and resolves port conflicts
- If manual configuration is needed, check `port-preferences.json`
- Default ranges: Backend (8001-8005), Frontend (3001-3005)

#### Docker Connection Issues
**Solution**:
1. Ensure Docker Desktop is running
2. Check Docker Desktop system tray icon
3. Restart Docker Desktop if needed
4. Verify Docker is accessible by running `docker ps` in Command Prompt

#### Application Won't Start
**Solution**:
1. Run as Administrator (right-click → "Run as administrator")
2. Check Windows Defender/antivirus exclusions
3. Verify file permissions in installation directory
4. Check logs in `%APPDATA%\N8NPlus\logs\`

### Getting Help
If you encounter issues:
1. Check the application logs in `%APPDATA%\N8NPlus\logs\`
2. Verify system requirements are met
3. Try running as Administrator
4. Restart Docker Desktop if using containers

## 🔧 Advanced Configuration

### Custom Port Configuration
Edit `%APPDATA%\N8NPlus\port-preferences.json`:
```json
{
  "backend": {
    "preferredPort": 8001,
    "fallbackPorts": [8002, 8003, 8004, 8005]
  },
  "frontend": {
    "preferredPort": 3001,
    "fallbackPorts": [3002, 3003, 3004, 3005]
  }
}
```

### Application Preferences
Edit `%APPDATA%\N8NPlus\app-preferences.json`:
```json
{
  "autoStart": true,
  "minimizeToTray": false,
  "checkForUpdates": true,
  "dockerAutoConnect": true
}
```

## 🔄 Uninstallation

### Standard Uninstall
1. Go to **Settings** → **Apps** → **Apps & features**
2. Find **N8NPlus** in the list
3. Click **Uninstall**
4. Follow the uninstaller prompts

### Complete Removal
To remove all data:
1. Uninstall the application (above steps)
2. Delete `%APPDATA%\N8NPlus\` folder
3. Remove desktop and start menu shortcuts (if any remain)

## 📋 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10 (64-bit) or Windows 11
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB for application + additional space for n8n data
- **Network**: Internet connection for Docker image downloads

### Dependencies (Automatically Handled)
- **Node.js v20.11.0**: Bundled with application
- **Docker Desktop**: Auto-detected, installation prompted if needed
- **npm**: Included with bundled Node.js

## ✅ Verification

### Successful Installation Checklist
- [ ] N8NPlus desktop shortcut created
- [ ] Application starts without errors
- [ ] Backend service starts automatically
- [ ] Frontend service starts automatically
- [ ] Docker connection established (if Docker Desktop is running)
- [ ] All services show green status indicators

### Test Your Installation
1. Launch N8NPlus
2. Wait for all services to start (green indicators)
3. Verify both backend and frontend are accessible
4. Check Docker connectivity (if using containers)
5. Create a test n8n workflow to verify full functionality

---

**Need Help?** Check the troubleshooting section above or create an issue on the GitHub repository.
