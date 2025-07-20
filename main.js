const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');
const ElectronSetupIntegration = require('./src/electron-setup');
const AutoUpdater = require('./src/auto-updater');

// Get version from package.json
const packageJson = require('./package.json');

let setupIntegration;
let autoUpdater;
let mainWindow;
let currentHost = 'localhost:8880';

// Server management variables
let backendProcess = null;
let frontendProcess = null;
let serversRunning = false;

// Port preferences with defaults
let portPreferences = {
  backend: {
    preferred: [9999, 9998, 9997, 9996, 9000],
    current: 9999
  },
  frontend: {
    preferred: [8880, 8008, 8080, 8808, 3000],
    current: 8880
  }
};

// Load user preferences from file
function loadPortPreferences() {
  try {
    const prefsPath = path.join(__dirname, 'port-preferences.json');
    if (fs.existsSync(prefsPath)) {
      const savedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      portPreferences = { ...portPreferences, ...savedPrefs };
      console.log('📋 Loaded port preferences:', portPreferences);
    }
  } catch (error) {
    console.log('📋 Using default port preferences');
  }
}

// Save user preferences to file
function savePortPreferences() {
  try {
    const prefsPath = path.join(__dirname, 'port-preferences.json');
    fs.writeFileSync(prefsPath, JSON.stringify(portPreferences, null, 2));
    console.log('💾 Saved port preferences');
  } catch (error) {
    console.error('❌ Failed to save port preferences:', error);
  }
}

// Function to find the best available icon
function getAppIcon() {
  const assetsPath = path.join(__dirname, 'assets');

  // Platform-specific icon preferences
  const platform = process.platform;
  let iconCandidates = [];

  switch (platform) {
    case 'win32':
      iconCandidates = ['icon.ico', 'icon.png', 'icon.svg'];
      break;
    case 'darwin':
      iconCandidates = ['icon.icns', 'icon.png', 'icon.svg'];
      break;
    default: // Linux and others
      iconCandidates = ['icon.png', 'icon.svg'];
      break;
  }

  console.log(`🎨 Looking for icon files for platform: ${platform}`);

  // Check if assets directory exists
  if (!fs.existsSync(assetsPath)) {
    console.log('📁 Assets directory not found, creating it...');
    fs.mkdirSync(assetsPath, { recursive: true });
    console.log('💡 Place your icon files in the assets/ folder');
    console.log('💡 Run "npm run icon-check" for detailed instructions');
    return undefined;
  }

  // Try to find the best available icon
  for (const iconFile of iconCandidates) {
    const iconPath = path.join(assetsPath, iconFile);
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      console.log(`✅ Using icon: ${iconFile} (${(stats.size / 1024).toFixed(2)} KB)`);
      return iconPath;
    } else {
      console.log(`❌ Icon not found: ${iconFile}`);
    }
  }

  console.log('🔍 No custom icon found in assets folder');
  console.log('💡 Run "npm run icon-check" to see how to add custom icons');
  console.log('🎨 Using default Electron icon for now');
  return undefined;
}

// Function to find the running React server port
async function findReactPort() {
  const net = require('net');
  const preferredPorts = [8880, 8008, 8080, 8808, 3000];
  
  for (const port of preferredPorts) {
    try {
      // Try to connect to the port to see if React is running
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        console.log(`🎯 Found React server on port ${port}`);
        return port;
      }
    } catch (err) {
      // Port not accessible, continue
    }
  }
  
  console.log('🔍 React server not found, using default port 8880');
  return 8880;
}

// Server management functions
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const http = require('http');
    
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      console.log(`🔍 Port ${port} check result: true (status: ${res.statusCode})`);
      req.destroy();
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log(`🔍 Port ${port} check result: false (${error.code || error.message})`);
      req.destroy();
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`🔍 Port ${port} check result: false (timeout)`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkServersRunning() {
  console.log('🔍 Checking server status...');
  
  // Check backend using flexible port system
  let backendRunning = false;
  let backendPort = null;
  
  for (const port of portPreferences.backend.preferred) {
    if (await isPortInUse(port)) {
      backendRunning = true;
      backendPort = port;
      portPreferences.backend.current = port;
      break;
    }
  }
  
  // Check frontend using flexible port system
  let frontendRunning = false;
  let frontendPort = null;
  
  for (const port of portPreferences.frontend.preferred) {
    if (await isPortInUse(port)) {
      frontendRunning = true;
      frontendPort = port;
      portPreferences.frontend.current = port;
      break;
    }
  }
  
  const previousServerState = serversRunning;
  serversRunning = backendRunning && frontendRunning;
  
  // Auto-refresh Electron when servers become available
  if (!previousServerState && serversRunning && frontendPort) {
    console.log('🔄 Servers detected as running - auto-refreshing Electron...');
    connectToHost(`localhost:${frontendPort}`);
  }
  
  console.log(`🔍 Server status - Backend: ${backendRunning ? '✅' : '❌'} (${backendPort || 'none'}), Frontend: ${frontendRunning ? '✅' : '❌'} (${frontendPort || 'none'})`);
  return { 
    backend: backendRunning, 
    frontend: frontendRunning, 
    both: serversRunning,
    backendPort,
    frontendPort
  };
}

function startBackendServer() {
  if (backendProcess) {
    console.log('🔧 Backend server already running');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log(`🔧 Starting backend server on port ${portPreferences.backend.current}...`);
    
    // Set the backend port via environment variable
    const env = { ...process.env, BACKEND_PORT: portPreferences.backend.current.toString() };
    
    backendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'backend'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env
    });

    let resolved = false;

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Backend: ${output.trim()}`);
      
      // More specific detection for backend startup
      if ((output.includes('N8NPlus backend listening on') || 
           output.includes(`Local:    http://localhost:${portPreferences.backend.current}`) ||
           output.includes(`Server running on port ${portPreferences.backend.current}`)) && !resolved) {
        console.log('✅ Backend server started successfully');
        resolved = true;
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data.toString()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend server:', error);
      backendProcess = null;
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    });

    backendProcess.on('exit', (code) => {
      console.log(`🔧 Backend server exited with code ${code}`);
      backendProcess = null;
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        console.log('✅ Backend server timeout - assuming started');
        resolved = true;
        resolve();
      }
    }, 30000);
  });
}

function startFrontendServer() {
  if (frontendProcess) {
    console.log('🌐 Frontend server already running');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log(`🌐 Starting frontend server on port ${portPreferences.frontend.current}...`);
    
    // Set the frontend port via environment variable
    const env = { ...process.env, PORT: portPreferences.frontend.current.toString() };
    
    frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env
    });

    let resolved = false;

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Frontend: ${output.trim()}`);
      
      // Better detection for frontend startup
      if ((output.includes('webpack compiled successfully') || 
           output.includes('Compiled successfully') ||
           output.includes(`Local:            http://localhost:${portPreferences.frontend.current}`) ||
           output.includes('You can now view')) && !resolved) {
        console.log('✅ Frontend server started successfully');
        resolved = true;
        resolve();
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`Frontend Error: ${errorOutput}`);
      // Don't treat deprecation warnings as fatal errors
      if (!errorOutput.includes('DeprecationWarning')) {
        // Only log non-deprecation errors
      }
    });

    frontendProcess.on('error', (error) => {
      console.error('❌ Failed to start frontend server:', error);
      frontendProcess = null;
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    });

    frontendProcess.on('exit', (code) => {
      console.log(`🌐 Frontend server exited with code ${code}`);
      frontendProcess = null;
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!resolved) {
        console.log('✅ Frontend server timeout - assuming started');
        resolved = true;
        resolve();
      }
    }, 60000);
  });
}

async function startServers() {
  try {
    console.log('🚀 Starting N8NPlus servers...');
    
    // Check if servers are already running
    const status = await checkServersRunning();
    if (status.both) {
      console.log('✅ Both servers already running');
      return { success: true, message: 'Servers already running' };
    }

    // Start backend first
    if (!status.backend) {
      await startBackendServer();
    }

    // Start frontend
    if (!status.frontend) {
      await startFrontendServer();
    }

    // Wait a bit and verify, then auto-connect
    setTimeout(async () => {
      const finalStatus = await checkServersRunning();
      if (finalStatus.both) {
        console.log('🎉 Both servers started successfully!');
        serversRunning = true;
        
        // Find the frontend port and auto-connect
        const frontendPorts = [8880, 8008, 8080, 8808, 3000];
        for (const port of frontendPorts) {
          if (await isPortInUse(port)) {
            console.log(`🔄 Auto-connecting to frontend on port ${port}...`);
            connectToHost(`localhost:${port}`);
            break;
          }
        }
      }
    }, 5000);

    return { success: true, message: 'Servers starting...' };
  } catch (error) {
    console.error('❌ Failed to start servers:', error);
    return { success: false, message: `Failed to start servers: ${error.message}` };
  }
}

function stopServers() {
  return new Promise((resolve) => {
    console.log('🛑 Stopping servers...');
    
    let stoppedCount = 0;
    let totalToStop = 0;
    
    if (backendProcess) {
      totalToStop++;
      backendProcess.once('exit', () => {
        stoppedCount++;
        if (stoppedCount >= totalToStop) resolve();
      });
      backendProcess.kill();
      backendProcess = null;
    }
    
    if (frontendProcess) {
      totalToStop++;
      frontendProcess.once('exit', () => {
        stoppedCount++;
        if (stoppedCount >= totalToStop) resolve();
      });
      frontendProcess.kill();
      frontendProcess = null;
    }
    
    if (totalToStop === 0) {
      resolve(); // Nothing to stop
    }
    
    serversRunning = false;
    console.log('🛑 Servers stopped');
    
    // Timeout after 5 seconds
    setTimeout(() => {
      resolve();
    }, 5000);
  });
}

// Port configuration functions
function showPortConfigDialog(window) {
  const configWindow = new BrowserWindow({
    width: 500,
    height: 450,
    parent: window,
    modal: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Port Configuration'
  });

  const configHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Port Configuration</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 20px; 
          background: #2d2d2d; 
          color: #ffffff;
          margin: 0;
        }
        .container { 
          background: #3d3d3d; 
          padding: 25px; 
          border-radius: 12px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        h3 { 
          margin-top: 0; 
          color: #ffffff; 
          font-size: 18px;
          margin-bottom: 20px;
        }
        .section {
          margin-bottom: 25px;
          padding: 15px;
          background: #2d2d2d;
          border-radius: 8px;
        }
        .section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #cccccc;
          font-size: 14px;
        }
        label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: 500; 
          color: #cccccc;
          font-size: 12px;
        }
        input { 
          width: 100%; 
          padding: 8px 12px; 
          margin-bottom: 10px; 
          font-size: 14px; 
          border: 1px solid #555;
          background: #1d1d1d;
          color: #ffffff;
          border-radius: 4px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #007acc;
          box-shadow: 0 0 0 2px rgba(0,122,204,0.2);
        }
        .current-port {
          font-size: 12px;
          color: #007acc;
          margin-bottom: 10px;
        }
        .port-list {
          font-size: 12px;
          color: #999;
          margin-bottom: 15px;
        }
        .buttons { 
          text-align: right; 
          margin-top: 25px; 
        }
        button { 
          padding: 10px 20px; 
          margin: 0 0 0 10px; 
          cursor: pointer; 
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        .save { 
          background: #007acc; 
          color: white; 
        }
        .save:hover {
          background: #005a9e;
        }
        .cancel { 
          background: #666; 
          color: white; 
        }
        .cancel:hover {
          background: #555;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>⚙️ Port Configuration</h3>
        
        <div class="section">
          <h4>🔧 Backend Server Ports</h4>
          <div class="current-port">Currently using: ${portPreferences.backend.current}</div>
          <label>Preferred Ports (comma-separated):</label>
          <input type="text" id="backendPorts" value="${portPreferences.backend.preferred.join(', ')}" placeholder="9999, 9998, 9997, 9996, 9000">
          <div class="port-list">Recommendation: Use 9xxx ports for backend</div>
        </div>
        
        <div class="section">
          <h4>🌐 Frontend Server Ports</h4>
          <div class="current-port">Currently using: ${portPreferences.frontend.current}</div>
          <label>Preferred Ports (comma-separated):</label>
          <input type="text" id="frontendPorts" value="${portPreferences.frontend.preferred.join(', ')}" placeholder="8880, 8008, 8080, 8808, 3000">
          <div class="port-list">Recommendation: Use 8xxx ports for frontend</div>
        </div>
        
        <div class="buttons">
          <button class="cancel" onclick="window.close()">Cancel</button>
          <button class="save" onclick="saveConfig()">Save Configuration</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        function saveConfig() {
          const backendPorts = document.getElementById('backendPorts').value
            .split(',')
            .map(p => parseInt(p.trim()))
            .filter(p => !isNaN(p) && p > 0 && p < 65536);
            
          const frontendPorts = document.getElementById('frontendPorts').value
            .split(',')
            .map(p => parseInt(p.trim()))
            .filter(p => !isNaN(p) && p > 0 && p < 65536);
          
          if (backendPorts.length === 0 || frontendPorts.length === 0) {
            alert('Please enter valid port numbers');
            return;
          }
          
          ipcRenderer.send('save-port-config', { 
            backend: backendPorts, 
            frontend: frontendPorts 
          });
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  configWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(configHtml));
  configWindow.show();
}

function createWindow() {
  const iconPath = getAppIcon();

  const windowOptions = {
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js'
    },
    title: 'N8NPlus - Docker n8n Container Manager'
  };

  // Only set icon if we found a custom one
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  const win = new BrowserWindow(windowOptions);

  // Store reference to main window
  mainWindow = win;

  win.loadURL(`http://${currentHost}`);

  // Initialize setup integration
  setupIntegration = new ElectronSetupIntegration();

  // Initialize auto-updater
  autoUpdater = new AutoUpdater(win);

  // Create application menu with update check option
  createApplicationMenu(win);

  // Check for updates on startup (only in production)
  if (!process.env.ELECTRON_IS_DEV) {
    autoUpdater.checkForUpdatesOnStartup();
  }
  
  return win;
}

function createApplicationMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Connect to Remote Host',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            showRemoteHostDialog(mainWindow);
          }
        },
        {
          label: 'Find Network Devices',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            findNetworkDevices(mainWindow);
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Servers',
      submenu: [
        {
          label: 'Start Servers',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const result = await startServers();
            dialog.showMessageBox(mainWindow, {
              type: result.success ? 'info' : 'error',
              title: 'Server Management',
              message: result.message,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Stop Servers',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => {
            stopServers();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Server Management',
              message: 'Servers stopped',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check Server Status',
          click: async () => {
            const status = await checkServersRunning();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Server Status',
              message: `Backend: ${status.backend ? 'Running ✅' : 'Stopped ❌'} ${status.backendPort ? `(Port: ${status.backendPort})` : ''}\nFrontend: ${status.frontend ? 'Running ✅' : 'Stopped ❌'} ${status.frontendPort ? `(Port: ${status.frontendPort})` : ''}`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Configure Ports...',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            showPortConfigDialog(mainWindow);
          }
        },
        {
          label: 'Show Current Ports',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Current Port Configuration',
              message: `Backend Ports: ${portPreferences.backend.preferred.join(', ')}\nCurrent Backend: ${portPreferences.backend.current}\n\nFrontend Ports: ${portPreferences.frontend.preferred.join(', ')}\nCurrent Frontend: ${portPreferences.frontend.current}`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Auto-Start on Launch',
          type: 'checkbox',
          checked: true, // Default to true
          click: (menuItem) => {
            // Save the preference (could be stored in app config)
            console.log('Auto-start preference:', menuItem.checked);
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Network',
      submenu: [
        {
          label: 'Connect to localhost',
          click: async () => {
            const port = await findReactPort();
            connectToHost(`localhost:${port}`);
          }
        },
        {
          label: 'Connect to Remote Host...',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            showRemoteHostDialog(mainWindow);
          }
        },
        { type: 'separator' },
        {
          label: 'Scan Network for N8NPlus',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            findNetworkDevices(mainWindow);
          }
        },
        {
          label: 'Show Network Info',
          click: () => {
            showNetworkInfo(mainWindow);
          }
        },
        { type: 'separator' },
        {
          label: 'Current Host',
          enabled: false,
          click: () => {},
          sublabel: currentHost
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            if (autoUpdater) {
              autoUpdater.checkForUpdates();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About N8NPlus',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About N8NPlus',
              message: `N8NPlus v${packageJson.version}`,
              detail: `Local n8n Container Manager\n\nA powerful Electron-based desktop application for managing multiple n8n Docker containers.\n\nCurrently connected to: ${currentHost}\n\nDeveloped by BWolf-16`
            });
          }
        },
        {
          label: 'GitHub Repository',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/BWolf-16/N8NPlus');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Load user preferences first
  loadPortPreferences();
  
  createWindow();

  // Auto-start servers after a short delay
  setTimeout(async () => {
    console.log('🚀 Auto-starting servers...');
    const status = await checkServersRunning();
    
    if (!status.both) {
      console.log('🔧 Starting servers automatically...');
      await startServers();
    } else {
      console.log('✅ Servers already running');
      // Connect to the running frontend
      const port = await findReactPort();
      connectToHost(`localhost:${port}`);
    }
  }, 2000); // Wait 2 seconds for app to fully initialize

  // Periodic check for manually started servers
  setInterval(async () => {
    if (!backendProcess && !frontendProcess) {
      // Only check if we're not managing the servers ourselves
      await checkServersRunning();
    }
  }, 5000); // Check every 5 seconds

  // Setup IPC handlers for auto-updater
  ipcMain.handle('check-for-updates', async () => {
    if (autoUpdater) {
      autoUpdater.checkForUpdates();
      return { success: true };
    }
    return { success: false, error: 'Auto-updater not initialized' };
  });

  // Setup IPC handlers for network functionality
  ipcMain.handle('connect-to-host', async (event, { host, port }) => {
    const hostWithPort = port && port !== '8880' ? `${host}:${port}` : `${host}:8880`;
    return connectToHost(hostWithPort);
  });

  ipcMain.handle('scan-network', async () => {
    return scanNetworkForN8NPlus();
  });

  ipcMain.handle('get-current-host', async () => {
    return currentHost;
  });

  // Setup IPC handlers for server management
  ipcMain.handle('start-servers', async () => {
    return await startServers();
  });

  ipcMain.handle('stop-servers', async () => {
    stopServers();
    return { success: true, message: 'Servers stopped' };
  });

  ipcMain.handle('check-server-status', async () => {
    return await checkServersRunning();
  });

  // Handle direct host connection from input dialog
  ipcMain.on('connect-to-host', (event, { host, port }) => {
    const hostWithPort = port && port !== '8880' ? `${host}:${port}` : `${host}:8880`;
    connectToHost(hostWithPort);
  });

  // Handle port configuration saving
  ipcMain.on('save-port-config', (event, { backend, frontend }) => {
    portPreferences.backend.preferred = backend;
    portPreferences.frontend.preferred = frontend;
    
    // Update current ports to the first preferred port if not in the list
    if (!backend.includes(portPreferences.backend.current)) {
      portPreferences.backend.current = backend[0];
    }
    if (!frontend.includes(portPreferences.frontend.current)) {
      portPreferences.frontend.current = frontend[0];
    }
    
    savePortPreferences();
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Port Configuration Saved',
      message: `Port preferences saved successfully!\n\nBackend: ${backend.join(', ')}\nFrontend: ${frontend.join(', ')}\n\nRestart servers to apply new port settings.`,
      buttons: ['OK']
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  console.log('📱 Stopping servers before app quit...');
  await stopServers();
});

app.on('will-quit', (event) => {
  // Make sure servers are stopped
  if (backendProcess || frontendProcess) {
    console.log('📱 Ensuring servers are stopped...');
    event.preventDefault();
    stopServers().then(() => {
      app.quit();
    });
  }
});

// Network-related functions
function connectToHost(hostWithPort) {
  currentHost = hostWithPort;
  console.log(`🌐 Connecting to: ${currentHost}`);
  
  if (mainWindow) {
    mainWindow.loadURL(`http://${currentHost}`);
    updateWindowTitle(currentHost);
    // Recreate menu to update current host display
    createApplicationMenu(mainWindow);
  }
  
  return { success: true, host: currentHost };
}

function updateWindowTitle(host) {
  if (mainWindow) {
    mainWindow.setTitle(`N8NPlus - Docker n8n Container Manager - Connected to: ${host}`);
  }
}

function showRemoteHostDialog(window) {
  // Create a simple input dialog window
  const inputWindow = new BrowserWindow({
    width: 450,
    height: 280,
    parent: window,
    modal: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Connect to Remote Host'
  });

  const inputHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connect to Remote Host</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 20px; 
          background: #2d2d2d; 
          color: #ffffff;
          margin: 0;
        }
        .container { 
          background: #3d3d3d; 
          padding: 25px; 
          border-radius: 12px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        h3 { 
          margin-top: 0; 
          color: #ffffff; 
          font-size: 18px;
          margin-bottom: 20px;
        }
        label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: 500; 
          color: #cccccc;
        }
        input { 
          width: 100%; 
          padding: 12px; 
          margin-bottom: 15px; 
          font-size: 14px; 
          border: 1px solid #555;
          background: #2d2d2d;
          color: #ffffff;
          border-radius: 6px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #007acc;
          box-shadow: 0 0 0 2px rgba(0,122,204,0.2);
        }
        .buttons { 
          text-align: right; 
          margin-top: 25px; 
        }
        button { 
          padding: 10px 20px; 
          margin: 0 0 0 10px; 
          cursor: pointer; 
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        .connect { 
          background: #007acc; 
          color: white; 
        }
        .connect:hover {
          background: #005a9e;
        }
        .cancel { 
          background: #666; 
          color: white; 
        }
        .cancel:hover {
          background: #555;
        }
        .examples {
          font-size: 12px;
          color: #999;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>🌐 Connect to Remote N8NPlus</h3>
        <label>Host IP or Hostname:</label>
        <input type="text" id="hostInput" placeholder="192.168.1.100 or your-pi.local" autofocus>
        <div class="examples">Examples: 192.168.1.100, your-pi.local, server.example.com</div>
        
        <label>Port (default: 8880):</label>
        <input type="text" id="portInput" placeholder="8880" value="8880">
        <div class="examples">N8NPlus frontend port (usually 8880, 8008, 8080, or 8808)</div>
        
        <div class="buttons">
          <button class="cancel" onclick="window.close()">Cancel</button>
          <button class="connect" onclick="connect()">Connect</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        function connect() {
          const host = document.getElementById('hostInput').value.trim();
          const port = document.getElementById('portInput').value.trim() || '8880';
          
          if (!host) {
            alert('Please enter a host IP or hostname');
            return;
          }
          
          ipcRenderer.send('connect-to-host', { host, port });
          window.close();
        }
        
        document.getElementById('hostInput').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') connect();
        });
        
        document.getElementById('portInput').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') connect();
        });
        
        // Focus on host input when window opens
        setTimeout(() => {
          document.getElementById('hostInput').focus();
        }, 100);
      </script>
    </body>
    </html>
  `;

  inputWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(inputHtml));
  inputWindow.show();
}

function findNetworkDevices(window) {
  const { dialog } = require('electron');
  
  // Show scanning dialog
  dialog.showMessageBox(window, {
    type: 'info',
    title: 'Scanning Network',
    message: 'Scanning for N8NPlus instances on your network...',
    detail: 'This may take 30-60 seconds to complete. Please wait.',
    buttons: ['Start Scan', 'Cancel']
  }).then((result) => {
    if (result.response === 0) {
      // Start network scan
      scanNetworkForN8NPlus(window);
    }
  });
}

async function scanNetworkForN8NPlus(window) {
  const os = require('os');
  const net = require('net');
  const { dialog } = require('electron');
  
  console.log('🔍 Starting network scan for N8NPlus instances...');
  
  // Get local network interfaces
  const interfaces = os.networkInterfaces();
  const networks = [];
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const alias of networkInterface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        const network = alias.address.substring(0, alias.address.lastIndexOf('.'));
        if (!networks.includes(network)) {
          networks.push(network);
        }
      }
    }
  }
  
  console.log('🔍 Scanning networks:', networks);
  
  const foundDevices = [];
  const scanPromises = [];
  const portsToScan = [8880, 8008, 8080, 8808, 3000];
  
  // Scan each network (limit to avoid overwhelming)
  for (const network of networks.slice(0, 2)) { // Limit to first 2 networks
    for (let i = 1; i <= 254; i++) {
      const ip = `${network}.${i}`;
      // Scan multiple ports for each IP
      for (const port of portsToScan) {
        scanPromises.push(scanHost(ip, port));
      }
    }
  }
  
  try {
    console.log(`🔍 Scanning ${scanPromises.length} addresses...`);
    const results = await Promise.allSettled(scanPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        foundDevices.push(result.value);
      }
    });
    
    console.log('🎯 Found N8NPlus devices:', foundDevices);
    
    if (foundDevices.length > 0) {
      showFoundDevices(window, foundDevices);
    } else {
      dialog.showMessageBox(window, {
        type: 'info',
        title: 'Network Scan Complete',
        message: 'No N8NPlus instances found on your network.',
        detail: 'Make sure the devices are running N8NPlus and accessible on ports 8880, 8008, 8080, 8808, or 3000.\n\nTip: You can still connect manually using "Connect to Remote Host" if you know the IP address.'
      });
    }
  } catch (error) {
    console.error('Network scan error:', error);
    dialog.showErrorBox('Scan Error', 'Failed to scan network: ' + error.message);
  }
}

function scanHost(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      // Additional check to see if it's actually N8NPlus
      checkIfN8NPlus(ip, port).then(isN8NPlus => {
        if (isN8NPlus) {
          resolve({ ip, port, host: `${ip}:${port}` });
        } else {
          resolve(null);
        }
      }).catch(() => resolve(null));
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.connect(port, ip);
  });
}

async function checkIfN8NPlus(ip, port) {
  try {
    // Try to fetch from the N8NPlus frontend
    const http = require('http');
    
    return new Promise((resolve) => {
      const options = {
        hostname: ip,
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // Check if the response contains N8NPlus indicators
          const isN8NPlus = data.includes('N8NPlus') || data.includes('n8n Container Manager');
          resolve(isN8NPlus);
        });
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

function showFoundDevices(window, devices) {
  // Create a device selection window
  const deviceWindow = new BrowserWindow({
    width: 500,
    height: 400,
    parent: window,
    modal: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Found N8NPlus Devices'
  });

  const deviceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Found N8NPlus Devices</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 20px; 
          background: #2d2d2d; 
          color: #ffffff;
          margin: 0;
        }
        .container { 
          background: #3d3d3d; 
          padding: 25px; 
          border-radius: 12px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          height: calc(100vh - 40px);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        h3 { 
          margin-top: 0; 
          color: #ffffff; 
          font-size: 18px;
          margin-bottom: 20px;
        }
        .devices-list {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 20px;
        }
        .device-item {
          background: #2d2d2d;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .device-item:hover {
          background: #404040;
          border-color: #007acc;
        }
        .device-ip {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 5px;
        }
        .device-port {
          font-size: 14px;
          color: #cccccc;
        }
        .buttons { 
          text-align: right; 
        }
        button { 
          padding: 10px 20px; 
          margin: 0 0 0 10px; 
          cursor: pointer; 
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        .close { 
          background: #666; 
          color: white; 
        }
        .close:hover {
          background: #555;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>🎯 Found N8NPlus Devices</h3>
        <div class="devices-list">
          ${devices.map(device => `
            <div class="device-item" onclick="connectToDevice('${device.host}')">
              <div class="device-ip">📡 ${device.ip}</div>
              <div class="device-port">Port: ${device.port}</div>
            </div>
          `).join('')}
        </div>
        <div class="buttons">
          <button class="close" onclick="window.close()">Close</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        function connectToDevice(host) {
          const [ip, port] = host.split(':');
          ipcRenderer.send('connect-to-host', { host: ip, port });
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  deviceWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(deviceHtml));
  deviceWindow.show();
}

function showNetworkInfo(window) {
  const os = require('os');
  const { dialog } = require('electron');
  
  const interfaces = os.networkInterfaces();
  let networkInfo = 'Network Interfaces:\n\n';
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    networkInfo += `${interfaceName}:\n`;
    
    for (const alias of networkInterface) {
      if (alias.family === 'IPv4') {
        networkInfo += `  IPv4: ${alias.address}`;
        if (alias.internal) {
          networkInfo += ' (internal)';
        }
        networkInfo += '\n';
      }
    }
    networkInfo += '\n';
  }
  
  networkInfo += `\nCurrent Host: ${currentHost}\n`;
  networkInfo += `Hostname: ${os.hostname()}\n`;
  networkInfo += `Platform: ${os.platform()} ${os.arch()}`;
  
  dialog.showMessageBox(window, {
    type: 'info',
    title: 'Network Information',
    message: 'Network Configuration',
    detail: networkInfo,
    buttons: ['OK']
  });
}