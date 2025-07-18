const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronSetupIntegration = require('./src/electron-setup');
const AutoUpdater = require('./src/auto-updater');

let setupIntegration;
let autoUpdater;

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

  win.loadURL("http://localhost:3000");
  
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
              message: 'N8NPlus v1.0.0',
              detail: 'Local n8n Container Manager\n\nA powerful Electron-based desktop application for managing multiple n8n Docker containers.\n\nDeveloped by BWolf-16'
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
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});