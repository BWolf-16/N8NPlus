# N8NPlus - Quick Start Guide

## 🚀 How to Run N8NPlus

### Option 1: Automated Startup (Recommended)
```bash
# Double-click or run:
start-safe.bat
```

This script will:
- ✅ Find available ports automatically
- ✅ Start backend and frontend in separate windows
- ✅ Launch the Electron app
- ✅ Handle port conflicts gracefully

### Option 2: Manual Startup
If the automated script doesn't work:

1. **Start Backend:**
   ```bash
   cd backend
   node index.js
   ```

2. **Start Frontend (new terminal):**
   ```bash
   cd frontend  
   node start-with-port.js
   ```

3. **Start Electron (new terminal):**
   ```bash
   npx electron .
   ```

### Option 3: Custom Ports
If you need specific ports:

```bash
# Backend on port 8005
cd backend
set BACKEND_PORT=8005
node index.js

# Frontend on port 3005
cd frontend
set PORT=3005
node start-with-port.js

# Then start Electron
npx electron .
```

## 🔧 Troubleshooting

### Common Issues:

1. **"Port already in use"**
   - Run `system-test.bat` to check available ports
   - Use `start-safe.bat` for automatic port selection

2. **"White screen in Electron"**
   - Ensure both backend and frontend are running first
   - Check the terminal windows for error messages
   - Try refreshing the Electron window (Ctrl+R)

3. **"Node.js not found"**
   - Install Node.js from https://nodejs.org/
   - Restart your terminal after installation

4. **"Dependencies missing"**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   npm install  # (in root directory)
   ```

### Port Information:
- **Backend Default Ports:** 8001, 8002, 8003, 8004, 8005
- **Frontend Default Ports:** 3001, 3002, 3003, 3004, 3005
- **The app will automatically find available ports**

## 📱 Using the Application

Once running, you can:
- ✅ Manage Docker containers through the web interface
- ✅ Use the "Servers" menu in Electron for server management
- ✅ Access preferences via Ctrl+, 
- ✅ Force restart servers via Ctrl+Shift+R

## 🆘 Need Help?

1. Run `system-test.bat` for diagnostic information
2. Check the console output in the terminal windows
3. Look for error messages in the Electron developer console (F12)

---
*N8NPlus v1.0.3 - Docker n8n Container Manager*
