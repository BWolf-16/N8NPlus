const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronSetupIntegration = require('./src/electron-setup');
const AutoUpdater = require('./src/auto-updater');

// Get version from package.json
const packageJson = require('./package.json');

let setupIntegration;
let autoUpdater;
let mainWindow;
let currentHost = 'localhost:8880';

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
  createWindow();

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

  // Handle direct host connection from input dialog
  ipcMain.on('connect-to-host', (event, { host, port }) => {
    const hostWithPort = port && port !== '8880' ? `${host}:${port}` : `${host}:8880`;
    connectToHost(hostWithPort);
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