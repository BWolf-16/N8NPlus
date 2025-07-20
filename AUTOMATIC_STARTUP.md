# N8NPlus Automatic Startup

N8NPlus now features **completely automatic startup** - no more batch files needed! Just launch the Electron app and everything starts automatically.

## ✨ How It Works

When you start N8NPlus, the application:

1. **🔍 Smart Port Detection**: Automatically scans for available ports starting with preferred ranges
2. **🚀 Automatic Server Startup**: Starts backend and frontend servers automatically  
3. **🔄 Intelligent Connection**: Connects to the frontend once servers are ready
4. **⚡ Instant Access**: You're ready to manage containers within seconds

## 🎯 Key Features

### Automatic Port Management
- **Backend Ports**: `8001, 8002, 8003, 8004, 8005, 9999, 9998, 9997, 9996, 9000`
- **Frontend Ports**: `3001, 3002, 3003, 3004, 3005, 8880, 8008, 8080, 8808, 3000`
- **Dynamic Fallback**: If preferred ports are busy, finds any available port automatically

### Smart Server Detection
- Checks if servers are already running before starting new ones
- Connects to existing servers if found
- Handles port conflicts gracefully with automatic retries

### Enhanced Error Handling
- Informative loading screens with progress indicators
- Helpful error messages with suggested solutions
- Manual controls if automatic startup fails

## ⚙️ Configuration

### Auto-Start Settings
Access via **Servers → Application Preferences**:

- ✅ **Auto-start servers on launch** (enabled by default)
- ⚙️ **Auto-run on PC start** (optional)
- 🔧 **Port configuration** (customizable)

### Manual Controls
If you prefer manual control:
1. **Servers → Application Preferences**
2. Disable "Auto-start servers on launch"
3. Use **Servers → Start Servers** when needed

## 🔧 Troubleshooting

### If Servers Don't Start
1. **Wait**: Initial startup can take 10-30 seconds
2. **Refresh**: Click "Try Again" in the loading screen
3. **Menu**: Use **Servers → Force Restart Servers**
4. **Status**: Check **Servers → Check Server Status**

### Port Conflicts
- N8NPlus automatically finds alternative ports
- View current ports: **Servers → Show Current Ports**
- Customize ranges: **Servers → Configure Ports**

### Manual Startup (if needed)
- **Backend**: `cd backend && node index.js`
- **Frontend**: `cd frontend && node start-with-port.js`

## 📋 Loading Process

The enhanced loading screen shows:
- **Progress indicators** with real-time status
- **Estimated time** for startup process
- **Manual controls** if needed
- **Auto-refresh** after 30 seconds

## 🎉 Benefits Over Batch Files

| Feature | Batch Files | Automatic Startup |
|---------|-------------|-------------------|
| **User Experience** | Manual steps required | One-click launch |
| **Port Management** | Fixed ports only | Smart port detection |
| **Error Handling** | Terminal errors | User-friendly messages |
| **Cross-Platform** | Windows only | Works everywhere |
| **Integration** | Separate processes | Fully integrated |

## 🚀 Getting Started

Simply double-click the N8NPlus executable or shortcut - everything else is automatic!

The app will:
1. Load your preferences
2. Check for running servers
3. Start servers automatically (if enabled)
4. Connect to the frontend
5. You're ready to manage containers!

---

*Note: The old batch files (`start-all.bat`, `start-safe.bat`, etc.) are still available as backup options, but are no longer needed for normal operation.*
