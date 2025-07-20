const { contextBridge, ipcRenderer } = require('electron');

// Expose setup and dependency checking functions to the renderer process
contextBridge.exposeInMainWorld('electronSetup', {
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  autoInstallDependencies: () => ipcRenderer.invoke('auto-install-dependencies'),
  showSetupDialog: (issues) => ipcRenderer.invoke('show-setup-dialog', issues),
  openManualInstall: (dependency) => ipcRenderer.invoke('open-manual-install', dependency),
  checkDockerStatus: () => ipcRenderer.invoke('check-docker-status'),
  startDocker: () => ipcRenderer.invoke('start-docker')
});

// Expose auto-updater and network functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-updater functions
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', callback);
  },
  removeUpdateStatusListener: (callback) => {
    ipcRenderer.removeListener('update-status', callback);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Network functions
  connectToHost: (host, port) => ipcRenderer.invoke('connect-to-host', { host, port }),
  scanNetwork: () => ipcRenderer.invoke('scan-network'),
  getCurrentHost: () => ipcRenderer.invoke('get-current-host')
});