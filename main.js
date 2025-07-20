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
let currentHost = 'localhost:3001';

// Server management variables
let backendProcess = null;
let frontendProcess = null;
let serversRunning = false;

// Port preferences with defaults
let portPreferences = {
  backend: {
    preferred: [8001, 8002, 8003, 8004, 8005, 9999, 9998, 9997, 9996, 9000],
    current: 8001
  },
  frontend: {
    preferred: [3001, 3002, 3003, 3004, 3005, 8880, 8008, 8080, 8808, 3000],
    current: 3001
  }
};

// Application preferences with defaults (auto-start enabled by default)
let appPreferences = {
  startup: {
    autoRunOnPCStart: false,
    autoStartServersOnLaunch: true, // Default to true for seamless experience
    minimizeToTray: false
  },
  containers: {
    stopContainersOnAppClose: false,
    stopServersOnAppClose: true,
    confirmBeforeStoppingContainers: true
  },
  docker: {
    autoConnectToLocal: true,
    showConnectionNotifications: true,
    retryFailedConnections: true
  },
  ui: {
    showStartupSplash: true,
    minimizeOnClose: false,
    rememberWindowSize: true,
    theme: 'auto' // auto, light, dark
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

// Load application preferences from file
function loadAppPreferences() {
  try {
    const prefsPath = path.join(__dirname, 'app-preferences.json');
    if (fs.existsSync(prefsPath)) {
      const savedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      appPreferences = { ...appPreferences, ...savedPrefs };
      console.log('📋 Loaded app preferences:', appPreferences);
      
      // Apply startup preferences
      if (appPreferences.startup.autoRunOnPCStart) {
        setupAutoStart();
      }
    }
  } catch (error) {
    console.log('📋 Using default app preferences');
  }
}

// Helper function to spawn Node.js processes with better Windows compatibility
function spawnNodeProcess(nodeExecutable, args, options) {
  console.log(`🔧 Attempting to spawn: ${nodeExecutable} ${args.join(' ')}`);
  
  // Remove quotes from nodeExecutable for direct execution
  const cleanNodeExecutable = nodeExecutable.replace(/"/g, '');
  
  // First try: Direct execution without shell (most reliable)
  try {
    console.log(`🔧 Trying direct execution: ${cleanNodeExecutable}`);
    return spawn(cleanNodeExecutable, args, { ...options, shell: false });
  } catch (error) {
    console.log(`⚠️ Direct execution failed: ${error.message}`);
  }
  
  // Second try: Use explicit shell path
  try {
    if (process.platform === 'win32') {
      const shellPath = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
      console.log(`🔧 Trying with shell: ${shellPath}`);
      if (fs.existsSync(shellPath)) {
        return spawn(nodeExecutable, args, { ...options, shell: shellPath });
      }
    }
  } catch (error) {
    console.log(`⚠️ Shell execution failed: ${error.message}`);
  }
  
  // Third try: Use shell: true as last resort
  try {
    console.log(`🔧 Trying shell: true`);
    return spawn(nodeExecutable, args, { ...options, shell: true });
  } catch (error) {
    console.log(`⚠️ Shell: true failed: ${error.message}`);
    throw new Error(`All spawn attempts failed. Last error: ${error.message}`);
  }
}

// Helper function to find the correct Node.js executable
function getNodeExecutable() {
  // Define possible bundled Node.js paths for different environments
  const possibleBundledPaths = [
    // Production: unpacked from asar
    path.join(__dirname, '..', 'app.asar.unpacked', 'node', 'node.exe'),
    // Production: alternative unpacked location
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node', 'node.exe'),
    // Development: local node directory
    path.join(__dirname, 'node', 'node.exe'),
    // Alternative production path
    path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'node', 'node.exe')
  ];
  
  // Try each bundled path
  for (const nodePath of possibleBundledPaths) {
    if (fs.existsSync(nodePath)) {
      console.log(`✅ Using bundled Node.js: ${nodePath}`);
      return nodePath;
    }
  }
  
  // Second, try using Electron's bundled Node.js
  const electronNodePath = process.execPath;
  if (electronNodePath && fs.existsSync(electronNodePath)) {
    console.log(`✅ Using Electron's Node.js: ${electronNodePath}`);
    return electronNodePath;
  }
  
  // On Windows, try common Node.js installation paths
  if (process.platform === 'win32') {
    const possiblePaths = [
      // Standard installation paths (without quotes first for direct execution)
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
      // User installation paths
      path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'node.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'bin', 'node.exe'),
      // Try node in PATH
      'node.exe',
      'node',
      // Local node_modules (shouldn't exist but just in case)
      path.join(__dirname, 'node_modules', '.bin', 'node.exe')
    ];
    
    // Try each path to see if it exists and is executable
    for (const nodePath of possiblePaths) {
      try {
        if (nodePath && fs.existsSync(nodePath)) {
          console.log(`✅ Found Node.js at: ${nodePath}`);
          // Return the path without quotes for direct execution compatibility
          return nodePath;
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    console.log('⚠️ No specific Node.js executable found, using default...');
  }
  
  // Default fallback - will work if node is in PATH
  return 'node';
}

// Save application preferences to file
function saveAppPreferences() {
  try {
    const prefsPath = path.join(__dirname, 'app-preferences.json');
    fs.writeFileSync(prefsPath, JSON.stringify(appPreferences, null, 2));
    console.log('💾 Saved app preferences');
  } catch (error) {
    console.error('❌ Failed to save app preferences:', error);
  }
}

// Setup auto-start with Windows
function setupAutoStart() {
  if (process.platform === 'win32') {
    try {
      const { spawn } = require('child_process');
      const appPath = process.execPath;
      const startupFolder = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      
      if (appPreferences.startup.autoRunOnPCStart) {
        // Create startup shortcut
        const shortcutPath = path.join(startupFolder, 'N8NPlus.lnk');
        const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${appPath.replace(/\\/g, '\\\\')}"
oLink.WorkingDirectory = "${__dirname.replace(/\\/g, '\\\\')}"
oLink.Description = "N8NPlus - Docker n8n Container Manager"
oLink.Save
        `;
        
        const tempVbs = path.join(require('os').tmpdir(), 'create_shortcut.vbs');
        fs.writeFileSync(tempVbs, vbsScript);
        spawn('cscript', [tempVbs], { windowsHide: true });
        
        console.log('✅ Auto-start enabled');
      } else {
        // Remove startup shortcut
        const shortcutPath = path.join(startupFolder, 'N8NPlus.lnk');
        if (fs.existsSync(shortcutPath)) {
          fs.unlinkSync(shortcutPath);
          console.log('❌ Auto-start disabled');
        }
      }
    } catch (error) {
      console.error('❌ Failed to setup auto-start:', error);
    }
  } else if (process.platform === 'darwin') {
    // macOS auto-start implementation
    app.setLoginItemSettings({
      openAtLogin: appPreferences.startup.autoRunOnPCStart,
      openAsHidden: appPreferences.startup.minimizeToTray
    });
  } else {
    // Linux auto-start implementation
    try {
      const autostartDir = path.join(require('os').homedir(), '.config', 'autostart');
      const desktopFile = path.join(autostartDir, 'n8nplus.desktop');
      
      if (appPreferences.startup.autoRunOnPCStart) {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }
        
        const desktopEntry = `[Desktop Entry]
Type=Application
Name=N8NPlus
Exec=${process.execPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=N8NPlus - Docker n8n Container Manager
`;
        fs.writeFileSync(desktopFile, desktopEntry);
        console.log('✅ Auto-start enabled (Linux)');
      } else {
        if (fs.existsSync(desktopFile)) {
          fs.unlinkSync(desktopFile);
          console.log('❌ Auto-start disabled (Linux)');
        }
      }
    } catch (error) {
      console.error('❌ Failed to setup auto-start (Linux):', error);
    }
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
    const env = { 
      ...process.env, 
      BACKEND_PORT: portPreferences.backend.current.toString(),
      NODE_ENV: 'production'
    };
    
    // Get the correct Node.js executable
    const nodeExecutable = getNodeExecutable();
    console.log(`🔧 Using Node.js executable: ${nodeExecutable}`);
    
    // Use the robust spawn helper function
    const nodeArgs = ['index.js'];
    const spawnOptions = {
      cwd: path.join(__dirname, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env
    };
    
    try {
      backendProcess = spawnNodeProcess(nodeExecutable, nodeArgs, spawnOptions);
    } catch (error) {
      console.error('❌ Failed to spawn backend process:', error);
      return Promise.reject(new Error(`Failed to start backend server: ${error.message}`));
    }

    let resolved = false;
    let startupOutput = '';

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log(`Backend: ${output.trim()}`);
      
      // Look for backend startup indicators
      if ((output.includes('listening on') || 
           output.includes('backend') ||
           output.includes('Server running') ||
           output.includes('🔧 N8NPlus backend listening') ||
           output.includes('Port')) && !resolved) {
        console.log('✅ Backend server started successfully');
        resolved = true;
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`Backend Error: ${error}`);
      
      // Handle port conflicts more gracefully
      if (error.includes('EADDRINUSE') && !resolved) {
        console.log('🔄 Backend port conflict detected, will try next available port');
        resolved = true;
        reject(new Error(`Port ${portPreferences.backend.current} is in use`));
      } else if (!error.includes('DeprecationWarning') && !error.includes('ExperimentalWarning')) {
        console.error(`❌ Backend startup error: ${error}`);
      }
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend server:', error);
      backendProcess = null;
      if (!resolved) {
        resolved = true;
        
        // Provide specific error messages for common issues
        if (error.code === 'ENOENT') {
          const errorMsg = `Node.js executable not found. Please ensure Node.js is installed and accessible.
          
Error Details: ${error.message}

Possible Solutions:
1. Install Node.js from https://nodejs.org/
2. Restart your computer after installation
3. Check that Node.js is in your system PATH
4. Try running as administrator`;
          reject(new Error(errorMsg));
        } else {
          reject(error);
        }
      }
    });

    backendProcess.on('exit', (code) => {
      console.log(`🔧 Backend server exited with code ${code}`);
      backendProcess = null;
      if (!resolved && code !== 0) {
        resolved = true;
        reject(new Error(`Backend server exited with code ${code}`));
      }
    });

    // Timeout after 20 seconds with more informative error
    setTimeout(() => {
      if (!resolved) {
        console.log('⏳ Backend server startup timeout - checking if it actually started...');
        
        // Check if backend is actually running despite timeout
        isPortInUse(portPreferences.backend.current).then(inUse => {
          if (inUse) {
            console.log('✅ Backend server appears to be running despite timeout');
            resolved = true;
            resolve();
          } else {
            console.log('❌ Backend server failed to start within timeout');
            resolved = true;
            reject(new Error(`Backend server startup timeout (${portPreferences.backend.current})`));
          }
        });
      }
    }, 20000);
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
    
    // Get the correct Node.js executable
    const nodeExecutable = getNodeExecutable();
    console.log(`🌐 Using Node.js executable: ${nodeExecutable}`);
    
    // Use the robust spawn helper function
    const nodeArgs = ['start-with-port.js'];
    const spawnOptions = {
      cwd: path.join(__dirname, 'frontend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env
    };
    
    try {
      frontendProcess = spawnNodeProcess(nodeExecutable, nodeArgs, spawnOptions);
    } catch (error) {
      console.error('❌ Failed to spawn frontend process:', error);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start frontend server: ${error.message}`));
        return;
      }
    }

    let resolved = false;

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Frontend: ${output.trim()}`);
      
      // Look for frontend startup indicators
      if ((output.includes('webpack compiled') || 
           output.includes('Compiled successfully') ||
           output.includes('Local:') ||
           output.includes('You can now view') ||
           output.includes('Starting React') ||
           output.includes('development server')) && !resolved) {
        console.log('✅ Frontend server started successfully');
        resolved = true;
        resolve();
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`Frontend Error: ${errorOutput}`);
      // Don't treat deprecation warnings as fatal errors
      if (!errorOutput.includes('DeprecationWarning') && !errorOutput.includes('ExperimentalWarning')) {
        console.error(`❌ Frontend startup error: ${errorOutput}`);
      }
    });

    frontendProcess.on('error', (error) => {
      console.error('❌ Failed to start frontend server:', error);
      frontendProcess = null;
      if (!resolved) {
        resolved = true;
        
        // Provide specific error messages for common issues
        if (error.code === 'ENOENT') {
          const errorMsg = `Node.js executable not found. Please ensure Node.js is installed and accessible.
          
Error Details: ${error.message}

Possible Solutions:
1. Install Node.js from https://nodejs.org/
2. Restart your computer after installation
3. Check that Node.js is in your system PATH
4. Try running as administrator`;
          reject(new Error(errorMsg));
        } else {
          reject(error);
        }
      }
    });

    frontendProcess.on('exit', (code) => {
      console.log(`🌐 Frontend server exited with code ${code}`);
      frontendProcess = null;
    });

    // Timeout after 20 seconds (reduced from 60)
    setTimeout(() => {
      if (!resolved) {
        console.log('✅ Frontend server timeout - assuming started');
        resolved = true;
        resolve();
      }
    }, 20000);
  });
}

async function findAvailablePort(preferredPorts, serviceName) {
  console.log(`🔍 Finding available port for ${serviceName}...`);
  
  for (const port of preferredPorts) {
    try {
      const available = await new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.once('close', () => resolve(true));
          server.close();
        });
        server.on('error', () => resolve(false));
      });
      
      if (available) {
        console.log(`✅ Found available port ${port} for ${serviceName}`);
        return port;
      } else {
        console.log(`❌ Port ${port} is in use`);
      }
    } catch (error) {
      console.log(`❌ Error checking port ${port}:`, error.message);
    }
  }
  
  // If no preferred port is available, find any available port starting from 8000
  console.log(`🔍 No preferred ports available for ${serviceName}, finding any available port...`);
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        console.log(`✅ Found dynamic port ${port} for ${serviceName}`);
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function startServers() {
  try {
    console.log('🚀 Starting N8NPlus servers with smart port detection...');
    
    // Check if servers are already running
    const status = await checkServersRunning();
    if (status.both) {
      console.log('✅ Both servers already running');
      serversRunning = true;
      
      // Update current host to use the detected frontend port
      if (status.frontendPort) {
        currentHost = `localhost:${status.frontendPort}`;
        connectToHost(currentHost);
      }
      
      return { success: true, message: 'Servers already running' };
    }

    // Find available ports with smart detection
    let backendPort = portPreferences.backend.current;
    let frontendPort = portPreferences.frontend.current;
    
    if (!status.backend) {
      backendPort = await findAvailablePort(portPreferences.backend.preferred, 'backend');
      portPreferences.backend.current = backendPort;
    }
    
    if (!status.frontend) {
      frontendPort = await findAvailablePort(portPreferences.frontend.preferred, 'frontend');
      portPreferences.frontend.current = frontendPort;
    }
    
    // Save updated port preferences
    savePortPreferences();

    // Start backend first
    if (!status.backend) {
      console.log(`🔧 Starting backend server on port ${backendPort}...`);
      await startBackendServer();
      
      // Wait for backend to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Start frontend
    if (!status.frontend) {
      console.log(`🌐 Starting frontend server on port ${frontendPort}...`);
      await startFrontendServer();
      
      // Wait for frontend to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Verify servers started with multiple attempts
    console.log('⏳ Verifying servers are running...');
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const finalStatus = await checkServersRunning();
      
      if (finalStatus.both) {
        console.log('🎉 Both servers started successfully!');
        serversRunning = true;
        
        // Update current host and connect
        currentHost = `localhost:${finalStatus.frontendPort}`;
        console.log(`🔄 Auto-connecting to frontend on ${currentHost}...`);
        connectToHost(currentHost);
        
        return { success: true, message: 'Servers started successfully!' };
      }
      
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for servers...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // If we get here, servers didn't start properly
    const finalStatus = await checkServersRunning();
    const message = `⚠️ Server startup incomplete after ${maxAttempts} attempts.\n\nBackend: ${finalStatus.backend ? '✅ Running' : '❌ Failed'}\nFrontend: ${finalStatus.frontend ? '✅ Running' : '❌ Failed'}`;
    
    if (mainWindow) {
      const errorHtml = `
        <html>
          <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔧 N8NPlus</h1>
            <h2>Server Startup Issue</h2>
            <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3>Status:</h3>
              <p>• Backend: ${finalStatus.backend ? '✅ Running' : '❌ Failed'} ${finalStatus.backendPort ? `(Port: ${finalStatus.backendPort})` : ''}</p>
              <p>• Frontend: ${finalStatus.frontend ? '✅ Running' : '❌ Failed'} ${finalStatus.frontendPort ? `(Port: ${finalStatus.frontendPort})` : ''}</p>
              
              <h3>Solutions:</h3>
              <ol>
                <li>Wait a moment and click <strong>"Try Again"</strong> below</li>
                <li>Use <strong>"Servers → Force Restart Servers"</strong> from the menu</li>
                <li>Check that Node.js and npm dependencies are installed</li>
                <li>Check the console for detailed error messages</li>
              </ol>
              
              <h3>Attempted Ports:</h3>
              <p style="background: #f0f0f0; padding: 10px; font-family: monospace; font-size: 12px;">
                Backend: ${backendPort}<br>
                Frontend: ${frontendPort}
              </p>
            </div>
            
            <p style="margin-top: 30px;">
              <button onclick="location.reload()" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                Try Again
              </button>
              <button onclick="window.electronAPI?.restartServers?.()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Force Restart
              </button>
            </p>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    }
    
    return { success: false, message };

  } catch (error) {
    console.error('❌ Failed to start servers:', error);
    
    if (mainWindow) {
      const errorHtml = `
        <html>
          <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔧 N8NPlus</h1>
            <h2>Critical Error</h2>
            <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3>Error Details:</h3>
              <p style="background: #f8f8f8; padding: 10px; border-left: 4px solid #dc3545; font-family: monospace; font-size: 12px; word-break: break-all;">
                ${error.message}
              </p>
              
              <h3>Possible Solutions:</h3>
              <ol>
                <li>Ensure Node.js is installed and accessible</li>
                <li>Check that all npm dependencies are installed</li>
                <li>Verify that backend and frontend folders exist</li>
                <li>Try running manually: <code>cd backend && npm install</code> then <code>cd ../frontend && npm install</code></li>
              </ol>
            </div>
            
            <p style="margin-top: 30px;">
              <button onclick="location.reload()" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Try Again
              </button>
            </p>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    }
    
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

// Application preferences dialog
function showAppPreferencesDialog(window) {
  const configWindow = new BrowserWindow({
    width: 650,
    height: 700,
    parent: window,
    modal: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Application Preferences'
  });

  const configHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Preferences</title>
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
          max-height: calc(100vh - 40px);
          overflow-y: auto;
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
          border-bottom: 1px solid #555;
          padding-bottom: 8px;
        }
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 0;
        }
        .setting-label {
          color: #cccccc;
          font-size: 13px;
          flex: 1;
        }
        .setting-description {
          color: #999;
          font-size: 11px;
          margin-top: 2px;
        }
        .setting-control {
          margin-left: 15px;
        }
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #007acc;
        }
        select {
          padding: 5px 8px;
          background: #1d1d1d;
          color: #ffffff;
          border: 1px solid #555;
          border-radius: 4px;
          font-size: 12px;
        }
        select:focus {
          outline: none;
          border-color: #007acc;
        }
        .buttons { 
          text-align: right; 
          margin-top: 25px; 
          padding-top: 15px;
          border-top: 1px solid #555;
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
        .reset {
          background: #d97706;
          color: white;
        }
        .reset:hover {
          background: #b45309;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>🔧 Application Preferences</h3>
        
        <div class="section">
          <h4>🚀 Startup Settings</h4>
          
          <div class="setting-row">
            <div class="setting-label">
              Auto-run when PC starts
              <div class="setting-description">Start N8NPlus automatically when your computer boots</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="autoRunOnPCStart" ${appPreferences.startup.autoRunOnPCStart ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Auto-start servers on launch
              <div class="setting-description">Automatically start backend and frontend servers when app opens</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="autoStartServersOnLaunch" ${appPreferences.startup.autoStartServersOnLaunch ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Minimize to system tray
              <div class="setting-description">Start minimized to system tray instead of showing window</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="minimizeToTray" ${appPreferences.startup.minimizeToTray ? 'checked' : ''}>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h4>🐳 Container Management</h4>
          
          <div class="setting-row">
            <div class="setting-label">
              Stop containers when app closes
              <div class="setting-description">Automatically stop all running Docker containers when N8NPlus exits</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="stopContainersOnAppClose" ${appPreferences.containers.stopContainersOnAppClose ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Stop servers when app closes
              <div class="setting-description">Stop backend and frontend servers when app exits</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="stopServersOnAppClose" ${appPreferences.containers.stopServersOnAppClose ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Confirm before stopping containers
              <div class="setting-description">Show confirmation dialog before stopping containers</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="confirmBeforeStoppingContainers" ${appPreferences.containers.confirmBeforeStoppingContainers ? 'checked' : ''}>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h4>🔗 Docker Connection</h4>
          
          <div class="setting-row">
            <div class="setting-label">
              Auto-connect to local Docker
              <div class="setting-description">Automatically connect to local Docker daemon on startup</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="autoConnectToLocal" ${appPreferences.docker.autoConnectToLocal ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Show connection notifications
              <div class="setting-description">Display notifications when Docker connections succeed or fail</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="showConnectionNotifications" ${appPreferences.docker.showConnectionNotifications ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Retry failed connections
              <div class="setting-description">Automatically retry Docker connections if they fail</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="retryFailedConnections" ${appPreferences.docker.retryFailedConnections ? 'checked' : ''}>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h4>🎨 User Interface</h4>
          
          <div class="setting-row">
            <div class="setting-label">
              Show startup splash screen
              <div class="setting-description">Display loading screen while app initializes</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="showStartupSplash" ${appPreferences.ui.showStartupSplash ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Minimize instead of close
              <div class="setting-description">Minimize to tray when clicking X button instead of exiting</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="minimizeOnClose" ${appPreferences.ui.minimizeOnClose ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Remember window size
              <div class="setting-description">Save and restore window size and position</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="rememberWindowSize" ${appPreferences.ui.rememberWindowSize ? 'checked' : ''}>
            </div>
          </div>
          
          <div class="setting-row">
            <div class="setting-label">
              Theme
              <div class="setting-description">Choose application color theme</div>
            </div>
            <div class="setting-control">
              <select id="theme">
                <option value="auto" ${appPreferences.ui.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                <option value="light" ${appPreferences.ui.theme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${appPreferences.ui.theme === 'dark' ? 'selected' : ''}>Dark</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="buttons">
          <button class="reset" onclick="resetToDefaults()">Reset Defaults</button>
          <button class="cancel" onclick="window.close()">Cancel</button>
          <button class="save" onclick="saveConfig()">Save Preferences</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        function saveConfig() {
          const newPreferences = {
            startup: {
              autoRunOnPCStart: document.getElementById('autoRunOnPCStart').checked,
              autoStartServersOnLaunch: document.getElementById('autoStartServersOnLaunch').checked,
              minimizeToTray: document.getElementById('minimizeToTray').checked
            },
            containers: {
              stopContainersOnAppClose: document.getElementById('stopContainersOnAppClose').checked,
              stopServersOnAppClose: document.getElementById('stopServersOnAppClose').checked,
              confirmBeforeStoppingContainers: document.getElementById('confirmBeforeStoppingContainers').checked
            },
            docker: {
              autoConnectToLocal: document.getElementById('autoConnectToLocal').checked,
              showConnectionNotifications: document.getElementById('showConnectionNotifications').checked,
              retryFailedConnections: document.getElementById('retryFailedConnections').checked
            },
            ui: {
              showStartupSplash: document.getElementById('showStartupSplash').checked,
              minimizeOnClose: document.getElementById('minimizeOnClose').checked,
              rememberWindowSize: document.getElementById('rememberWindowSize').checked,
              theme: document.getElementById('theme').value
            }
          };
          
          ipcRenderer.send('save-app-preferences', newPreferences);
          window.close();
        }
        
        function resetToDefaults() {
          if (confirm('Are you sure you want to reset all preferences to defaults?')) {
            // Reset all checkboxes and selects to default values
            document.getElementById('autoRunOnPCStart').checked = false;
            document.getElementById('autoStartServersOnLaunch').checked = true;
            document.getElementById('minimizeToTray').checked = false;
            document.getElementById('stopContainersOnAppClose').checked = false;
            document.getElementById('stopServersOnAppClose').checked = true;
            document.getElementById('confirmBeforeStoppingContainers').checked = true;
            document.getElementById('autoConnectToLocal').checked = true;
            document.getElementById('showConnectionNotifications').checked = true;
            document.getElementById('retryFailedConnections').checked = true;
            document.getElementById('showStartupSplash').checked = true;
            document.getElementById('minimizeOnClose').checked = false;
            document.getElementById('rememberWindowSize').checked = true;
            document.getElementById('theme').value = 'auto';
          }
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
    title: 'N8NPlus - Docker n8n Container Manager',
    show: false // Don't show until we're ready
  };

  // Only set icon if we found a custom one
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  const win = new BrowserWindow(windowOptions);

  // Store reference to main window
  mainWindow = win;

  // Load a loading page initially
  win.loadFile(path.join(__dirname, 'loading.html')).catch(() => {
    // Fallback if loading.html doesn't exist
    win.loadURL('data:text/html,<html><body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;"><h1>N8NPlus Starting...</h1><p>Initializing servers, please wait...</p></body></html>');
  });

  // Show window after it's ready
  win.once('ready-to-show', () => {
    win.show();
  });

  // Handle navigation errors
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode !== -3) { // Ignore ABORTED errors (user navigation)
      console.log(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
      // Show a helpful error page
      const errorHtml = `
        <html>
          <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔧 N8NPlus</h1>
            <h2>Starting Services...</h2>
            <p>Waiting for servers to start. This may take a moment.</p>
            <p><small>If this persists, try manually starting servers from the menu.</small></p>
            <script>
              setTimeout(() => {
                window.location.reload();
              }, 5000);
            </script>
          </body>
        </html>
      `;
      win.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    }
  });

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
          label: 'Force Restart Servers',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            try {
              // Stop servers first
              await stopServers();
              // Wait a moment
              setTimeout(async () => {
                // Start servers
                const result = await startServers();
                dialog.showMessageBox(mainWindow, {
                  type: result.success ? 'info' : 'error',
                  title: 'Server Management',
                  message: result.success ? 'Servers restarted successfully' : `Failed to restart servers: ${result.message}`,
                  buttons: ['OK']
                });
              }, 2000);
            } catch (error) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Server Management',
                message: `Failed to restart servers: ${error.message}`,
                buttons: ['OK']
              });
            }
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
          label: 'Application Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            showAppPreferencesDialog(mainWindow);
          }
        },
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
        }
      ]
    },
    {
      label: 'Docker',
      submenu: [
        {
          label: 'Docker Connection Manager',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            // Send message to renderer to open Docker connection modal
            mainWindow.webContents.send('open-docker-connection-modal');
          }
        },
        {
          label: 'Scan Network for Docker',
          click: async () => {
            // Send message to renderer to scan for Docker
            mainWindow.webContents.send('scan-docker-network');
          }
        },
        {
          label: 'Connect to Local Docker',
          click: () => {
            // Send message to renderer to connect to local Docker
            mainWindow.webContents.send('connect-local-docker');
          }
        },
        { type: 'separator' },
        {
          label: 'Show Docker Status',
          click: () => {
            // Send message to get Docker status and show it
            mainWindow.webContents.send('show-docker-status');
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

app.whenReady().then(async () => {
  // Load user preferences first
  loadPortPreferences();
  loadAppPreferences();
  
  createWindow();

  // Enhanced automatic server startup process
  console.log('🔍 Initializing N8NPlus with smart server management...');
  
  try {
    // Check if servers are already running first
    const initialStatus = await checkServersRunning();
    
    if (initialStatus.both) {
      console.log('✅ Servers already running - connecting immediately');
      serversRunning = true;
      currentHost = `localhost:${initialStatus.frontendPort}`;
      connectToHost(currentHost);
    } else {
      // Show a more informative loading screen
      if (mainWindow) {
        const loadingHtml = `
          <html>
            <body style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: Arial; text-align: center; padding: 50px; color: white;">
              <div style="max-width: 500px; margin: 0 auto;">
                <h1 style="font-size: 2.5em; margin-bottom: 20px;">🔧 N8NPlus</h1>
                <h2 style="font-size: 1.2em; font-weight: normal; margin-bottom: 40px;">Docker n8n Container Manager</h2>
                
                <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; backdrop-filter: blur(10px);">
                  <div style="margin-bottom: 20px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  </div>
                  
                  <h3 style="margin: 20px 0;">Starting Services...</h3>
                  <p style="margin: 10px 0; opacity: 0.9;">Checking for available ports</p>
                  <p style="margin: 10px 0; opacity: 0.9;">Initializing backend and frontend servers</p>
                  <p style="margin: 10px 0; opacity: 0.7; font-size: 0.9em;">This may take 10-30 seconds</p>
                </div>
                
                <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9em;">
                  Auto-start: ${appPreferences.startup.autoStartServersOnLaunch ? 'Enabled ✅' : 'Disabled ❌'}
                </p>
              </div>
              
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </body>
          </html>
        `;
        mainWindow.loadURL(`data:text/html,${encodeURIComponent(loadingHtml)}`);
      }
      
      // Auto-start servers based on preferences
      if (appPreferences.startup.autoStartServersOnLaunch) {
        console.log('🚀 Auto-starting servers (enabled in preferences)...');
        
        try {
          const result = await startServers();
          
          if (result.success) {
            console.log('🎉 Servers started successfully via auto-start');
          } else {
            console.log('⚠️ Auto-start encountered issues:', result.message);
          }
        } catch (error) {
          console.error('❌ Auto-start failed:', error);
          
          // Show error in main window
          if (mainWindow) {
            const errorHtml = `
              <html>
                <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
                  <h1>🔧 N8NPlus</h1>
                  <h2>Auto-Start Failed</h2>
                  <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p><strong>Automatic server startup failed.</strong></p>
                    <p>Error: ${error.message}</p>
                    
                    <h3>Manual Options:</h3>
                    <ol>
                      <li>Use <strong>"Servers → Start Servers"</strong> from the menu</li>
                      <li>Check <strong>"Servers → Check Server Status"</strong> for details</li>
                      <li>Disable auto-start in <strong>"Servers → Application Preferences"</strong></li>
                    </ol>
                  </div>
                  
                  <p style="margin-top: 30px;">
                    <button onclick="window.electronAPI?.startServers?.()" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                      Try Start Servers
                    </button>
                    <button onclick="location.reload()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                      Refresh
                    </button>
                  </p>
                </body>
              </html>
            `;
            mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
          }
        }
      } else {
        console.log('📝 Auto-start servers disabled in preferences');
        
        // Still check if servers are running manually and connect if they are
        setTimeout(async () => {
          const status = await checkServersRunning();
          if (status.both) {
            console.log('✅ Found manually started servers - connecting');
            serversRunning = true;
            currentHost = `localhost:${status.frontendPort}`;
            connectToHost(currentHost);
          } else {
            // Show instructions for manual startup
            if (mainWindow) {
              const instructionsHtml = `
                <html>
                  <body style="background: #f8f9fa; font-family: Arial; text-align: center; padding: 50px;">
                    <h1>🔧 N8NPlus</h1>
                    <h2>Ready to Start</h2>
                    <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <p><strong>Automatic server startup is disabled.</strong></p>
                      <p>You can start the servers manually using any of these options:</p>
                      
                      <h3>🎯 Quick Options:</h3>
                      <ol>
                        <li><strong>Menu:</strong> Servers → Start Servers</li>
                        <li><strong>Keyboard:</strong> Ctrl+Shift+S</li>
                      </ol>
                      
                      <h3>⚙️ Settings:</h3>
                      <p>Enable automatic startup: <strong>Servers → Application Preferences</strong></p>
                    </div>
                    
                    <p style="margin-top: 30px;">
                      <button onclick="window.electronAPI?.startServers?.()" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                        Start Servers Now
                      </button>
                      <button onclick="window.electronAPI?.openPreferences?.()" style="background: #007acc; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                        Open Preferences
                      </button>
                    </p>
                  </body>
                </html>
              `;
              mainWindow.loadURL(`data:text/html,${encodeURIComponent(instructionsHtml)}`);
            }
          }
        }, 2000);
      }
    }
    
    // Enhanced periodic check for manually started servers
    setInterval(async () => {
      if (!serversRunning) {
        const status = await checkServersRunning();
        if (status.both && status.frontendPort) {
          console.log('🔍 Detected manually started servers - auto-connecting');
          serversRunning = true;
          currentHost = `localhost:${status.frontendPort}`;
          connectToHost(currentHost);
        }
      }
    }, 5000); // Check every 5 seconds
    
  } catch (error) {
    console.error('❌ Error during app initialization:', error);
    
    if (mainWindow) {
      const criticalErrorHtml = `
        <html>
          <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔧 N8NPlus</h1>
            <h2>Critical Initialization Error</h2>
            <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #dc3545;">
              <h3>Error Details:</h3>
              <p style="background: #f8f8f8; padding: 10px; font-family: monospace; font-size: 12px; word-break: break-all;">
                ${error.message}
              </p>
              
              <h3>Recommended Actions:</h3>
              <ol>
                <li>Restart the application</li>
                <li>Check that Node.js is properly installed</li>
                <li>Verify project dependencies are installed</li>
                <li>Check console logs for additional details</li>
              </ol>
            </div>
            
            <p style="margin-top: 30px;">
              <button onclick="location.reload()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Retry Initialization
              </button>
            </p>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(criticalErrorHtml)}`);
    }
  }
});

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

  ipcMain.handle('restart-servers', async () => {
    try {
      await stopServers();
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await startServers();
    } catch (error) {
      return { success: false, message: `Failed to restart servers: ${error.message}` };
    }
  });

  ipcMain.handle('check-server-status', async () => {
    return await checkServersRunning();
  });

  ipcMain.handle('open-preferences', async () => {
    if (mainWindow) {
      showAppPreferencesDialog(mainWindow);
    }
    return { success: true };
  });

  ipcMain.handle('open-port-config', async () => {
    if (mainWindow) {
      showPortConfigDialog(mainWindow);
    }
    return { success: true };
  });

  // Docker connection IPC handlers
  ipcMain.on('open-docker-connection-modal', (event) => {
    // Forward the message to the renderer to open the modal
    event.sender.send('show-docker-connection-modal');
  });

  ipcMain.on('scan-docker-network', (event) => {
    // Forward the message to the renderer to start network scan
    event.sender.send('start-docker-network-scan');
  });

  ipcMain.on('connect-local-docker', (event) => {
    // Forward the message to the renderer to connect to local Docker
    event.sender.send('connect-to-local-docker');
  });

  ipcMain.on('show-docker-status', (event) => {
    // Forward the message to the renderer to show Docker status
    event.sender.send('display-docker-status');
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

  // Handle application preferences saving
  ipcMain.on('save-app-preferences', (event, newPreferences) => {
    const oldAutoStart = appPreferences.startup.autoRunOnPCStart;
    appPreferences = { ...appPreferences, ...newPreferences };
    
    // Apply auto-start setting if it changed
    if (oldAutoStart !== appPreferences.startup.autoRunOnPCStart) {
      setupAutoStart();
    }
    
    saveAppPreferences();
    
    const changesMessage = [];
    if (oldAutoStart !== appPreferences.startup.autoRunOnPCStart) {
      changesMessage.push(`• Auto-start: ${appPreferences.startup.autoRunOnPCStart ? 'Enabled' : 'Disabled'}`);
    }
    
    changesMessage.push('• All preferences saved successfully');
    
    if (appPreferences.containers.stopContainersOnAppClose || appPreferences.containers.stopServersOnAppClose) {
      changesMessage.push('• Cleanup settings will apply on next app exit');
    }
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Application Preferences Saved',
      message: 'Preferences updated successfully!\n\n' + changesMessage.join('\n'),
      buttons: ['OK']
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    handleAppExit();
  }
});

app.on('before-quit', async (event) => {
  // Prevent immediate quit to handle cleanup properly
  event.preventDefault();
  await handleAppExit();
});

app.on('will-quit', (event) => {
  // This should only run if cleanup is already done
  if (backendProcess || frontendProcess) {
    console.log('📱 Final cleanup: ensuring servers are stopped...');
    event.preventDefault();
    stopServers().then(() => {
      app.exit(0);
    });
  }
});

// Comprehensive app exit handler
async function handleAppExit() {
  console.log('📱 Handling app exit with preferences...');
  
  let shouldStopContainers = appPreferences.containers.stopContainersOnAppClose;
  let shouldStopServers = appPreferences.containers.stopServersOnAppClose;
  
  // Show confirmation dialog if enabled
  if (appPreferences.containers.confirmBeforeStoppingContainers && 
      (shouldStopContainers || shouldStopServers)) {
    
    const actions = [];
    if (shouldStopServers) actions.push('Stop servers');
    if (shouldStopContainers) actions.push('Stop Docker containers');
    
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Confirm Exit',
      message: 'N8NPlus is about to exit.',
      detail: `The following actions will be performed:\n• ${actions.join('\n• ')}\n\nDo you want to continue?`,
      buttons: ['Exit and Cleanup', 'Exit Without Cleanup', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    });
    
    if (response.response === 2) {
      // Cancel exit
      return;
    } else if (response.response === 1) {
      // Exit without cleanup
      shouldStopContainers = false;
      shouldStopServers = false;
    }
  }
  
  try {
    // Stop containers if requested
    if (shouldStopContainers) {
      console.log('🐳 Stopping Docker containers...');
      // Send request to backend to stop all containers
      try {
        const http = require('http');
        const postData = JSON.stringify({ action: 'stop_all' });
        
        const options = {
          hostname: 'localhost',
          port: portPreferences.backend.current,
          path: '/api/containers/stop-all',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 5000
        };
        
        const req = http.request(options, (res) => {
          console.log('✅ Containers stop request sent');
        });
        
        req.on('error', (error) => {
          console.log('⚠️ Could not stop containers:', error.message);
        });
        
        req.write(postData);
        req.end();
        
        // Wait a moment for containers to stop
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log('⚠️ Error stopping containers:', error.message);
      }
    }
    
    // Stop servers if requested
    if (shouldStopServers) {
      console.log('🔧 Stopping servers...');
      await stopServers();
    }
    
    console.log('✅ Cleanup completed, exiting app');
    app.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    app.exit(1);
  }
}

// Network-related functions
function connectToHost(hostWithPort) {
  currentHost = hostWithPort;
  console.log(`🌐 Connecting to: ${currentHost}`);
  
  if (mainWindow) {
    // Try to connect to the host
    mainWindow.loadURL(`http://${currentHost}`).catch((error) => {
      console.error(`❌ Failed to connect to ${currentHost}:`, error);
      // Show error page but keep trying
      const errorHtml = `
        <html>
          <body style="background: #f5f5f5; font-family: Arial; text-align: center; padding: 50px;">
            <h1>🔧 N8NPlus</h1>
            <h2>Connection Failed</h2>
            <p>Could not connect to: ${currentHost}</p>
            <p>Retrying automatically...</p>
            <script>
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            </script>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    });
    
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