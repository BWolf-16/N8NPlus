const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronSetupIntegration = require('./src/electron-setup');

let setupIntegration;

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
}

app.whenReady().then(createWindow);