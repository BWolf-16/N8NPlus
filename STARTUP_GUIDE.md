# N8NPlus - Server Startup Guide

## Overview
N8NPlus consists of three components that work together:
1. **Backend Server** (Node.js/Express API)
2. **Frontend Server** (React development server)
3. **Electron App** (Desktop application)

## Quick Start

### Option 1: Automatic Startup (Recommended)
1. Run `npx electron .` or double-click `start-electron.bat`
2. The app will automatically try to start both servers
3. If auto-startup fails, use the manual options below

### Option 2: Manual Startup (Reliable)
1. Double-click `start-all.bat` - this will:
   - Start backend server in a new window
   - Start frontend server in a new window  
   - Launch the Electron app

### Option 3: Step-by-Step Manual Startup
1. **Start Backend Server:**
   ```bash
   cd backend
   node index.js
   ```
   - Should show: "N8NPlus backend listening on: http://localhost:9999"

2. **Start Frontend Server:**
   ```bash
   cd frontend
   node start-with-port.js
   ```
   - Should show: "Starting React on port 8880..."

3. **Start Electron App:**
   ```bash
   npx electron .
   ```

## Troubleshooting

### White Screen in Electron
- **Cause**: Servers haven't started yet or failed to start
- **Solution**: 
  1. Use "Servers → Check Server Status" from the menu
  2. Use "Servers → Force Restart Servers" from the menu
  3. Or manually start servers using the batch files

### Servers Won't Start
1. **Check Node.js**: Run `node --version` - should show v14+ 
2. **Install Dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Check Ports**: Make sure ports 9999 and 8880 aren't in use
4. **Manual Start**: Use the individual batch files:
   - `start-backend.bat`
   - `start-frontend.bat`

### Port Conflicts
- The app will automatically try different ports in this order:
  - Backend: 9999, 9998, 9997, 9996, 9000
  - Frontend: 8880, 8008, 8080, 8808, 3000
- You can configure custom ports via "Servers → Configure Ports" menu

## Menu Options
- **Ctrl+Shift+S**: Start Servers
- **Ctrl+Shift+X**: Stop Servers  
- **Ctrl+Shift+R**: Force Restart Servers
- **Ctrl+,**: Application Preferences
- **Ctrl+Shift+P**: Configure Ports

## Files Created
- `app-preferences.json` - Application settings
- `port-preferences.json` - Port configuration
- `backend/containers.json` - Container data
- `backend/docker-*.json` - Docker configuration

## Support
If you continue to have issues:
1. Check the console output in the terminal windows
2. Verify all dependencies are installed
3. Try running each component separately
4. Check firewall settings for Node.js

## Development Mode
For development, you can run each component separately:
- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npm start` 
- Electron: `npx electron .`
