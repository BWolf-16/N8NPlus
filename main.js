const { app, BrowserWindow } = require('electron');
const ElectronSetupIntegration = require('./src/electron-setup');

let setupIntegration;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js'
    },
  });

  win.loadURL("http://localhost:3000");
  
  // Initialize setup integration
  setupIntegration = new ElectronSetupIntegration();
}

app.whenReady().then(createWindow);