# N8NPlus v1.0.4 Release Notes

🎉 **Major Release: Self-Contained Application with Enhanced Automatic Startup**

## 🚀 Key Features

### ✨ Automatic Startup System
- **No more batch files required!** - N8NPlus now starts automatically when launched
- Intelligent port detection and management (Backend: 8001-8005, Frontend: 3001-3005)
- Automatic conflict resolution and fallback port selection
- Real-time status monitoring with visual indicators

### 📦 Self-Contained Installation
- **Bundled Node.js v20.11.0** - No separate Node.js installation required
- Enhanced installer with dependency detection
- Portable Node.js runtime included in the application
- Multiple Node.js detection strategies for maximum compatibility

### 🐳 Docker Integration
- Seamless Docker Desktop integration
- Automatic container management and lifecycle handling
- Support for multiple n8n instances with isolated environments
- Volume and network management

### 🔧 Enhanced Reliability
- Progressive Node.js execution strategies (bundled → system → Electron)
- Comprehensive error handling and recovery mechanisms
- Improved spawn process management with direct execution
- Smart dependency resolution

## 📋 Installation Options

### Option 1: Complete Installer (Recommended)
Download `N8NPlus Setup 1.0.4.exe` - This includes everything you need:
- ✅ N8NPlus application
- ✅ Node.js v20.11.0 bundled
- ✅ Automatic desktop and start menu shortcuts
- ✅ Smart dependency detection

### Option 2: Portable Version
If you prefer a portable installation, extract the application files and run N8NPlus.exe directly.

## 🎯 What's New in v1.0.4

### Automatic Startup (No Batch Files)
- **Before**: Users had to manually run batch files to start backend and frontend
- **After**: Single click on N8NPlus icon starts everything automatically
- Smart port detection prevents conflicts with other applications
- Visual startup progress and status indicators

### Bundled Dependencies
- Node.js v20.11.0 included in the application package
- No need for users to install Node.js separately
- Fallback to system Node.js if needed
- Enhanced compatibility across different Windows configurations

### Enhanced Error Handling
- Multiple execution strategies for maximum reliability
- Detailed error logging and user-friendly error messages
- Automatic recovery from common startup issues
- Comprehensive diagnostic information

## 🛠️ Technical Improvements

### Node.js Integration
```javascript
// Progressive Node.js detection
const getNodeExecutable = () => {
  // 1. Try bundled Node.js first
  // 2. Fall back to system Node.js
  // 3. Use Electron's Node.js as last resort
};
```

### Smart Port Management
- Dynamic port allocation with conflict detection
- Range-based port selection (Backend: 8001-8005, Frontend: 3001-3005)
- Automatic port testing and validation
- Persistent port preferences

### Process Management
- Direct process execution bypassing shell limitations
- Enhanced spawn process management
- Comprehensive error handling and recovery
- Real-time process monitoring

## 📖 Usage Instructions

### Quick Start
1. Download and run `N8NPlus Setup 1.0.4.exe`
2. Follow the installation wizard
3. Launch N8NPlus from desktop shortcut or start menu
4. The application will automatically start all required services
5. Access your n8n instances through the built-in interface

### No Configuration Required
- Everything works out of the box
- Automatic service discovery and startup
- No manual port configuration needed
- No separate Node.js installation required

## 🔍 System Requirements

### Minimum Requirements
- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB for application + space for n8n data
- **Docker**: Docker Desktop (automatically detected, installation prompted if needed)

### What's Included
- ✅ N8NPlus Electron Application
- ✅ Node.js v20.11.0 Runtime
- ✅ Frontend React Application (built)
- ✅ Backend Express Server
- ✅ Docker Integration Layer
- ✅ Automatic Startup System

## 🐛 Bug Fixes

### Resolved Issues
- ❌ **Fixed**: Node.js spawn ENOENT errors
- ❌ **Fixed**: Shell execution path issues
- ❌ **Fixed**: Manual batch file dependency
- ❌ **Fixed**: Port conflict detection
- ❌ **Fixed**: Dependency installation requirements

### Enhanced Reliability
- Improved error messages and user guidance
- Better handling of edge cases and system configurations
- Enhanced compatibility across different Windows setups
- More robust process management

## 🚀 Performance Improvements

- **Faster Startup**: Bundled Node.js eliminates external dependency checks
- **Reduced Complexity**: Single executable handles all operations
- **Better Resource Management**: Optimized process spawning and management
- **Enhanced User Experience**: No technical setup required

## 🔮 Coming Soon

- Auto-update functionality
- Multi-platform support (macOS, Linux)
- Enhanced Docker management features
- Advanced configuration options
- Plugin system for extensions

## 🙏 Acknowledgments

Special thanks to the community for feedback and testing that made this release possible!

---

**Download**: [N8NPlus Setup 1.0.4.exe](https://github.com/BWolf-16/N8NPlus/releases/download/v1.0.4/N8NPlus%20Setup%201.0.4.exe)

**Full Package**: 95.77 MB (includes Node.js runtime)

**Checksums**: Available in release assets
