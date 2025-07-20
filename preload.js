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
    getCurrentHost: () => ipcRenderer.invoke('get-current-host'),
  
  // Server management functions
  startServers: () => ipcRenderer.invoke('start-servers'),
  stopServers: () => ipcRenderer.invoke('stop-servers'),
  restartServers: () => ipcRenderer.invoke('restart-servers'),
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),
  
  // Application functions
  openPreferences: () => ipcRenderer.invoke('open-preferences'),
  openPortConfig: () => ipcRenderer.invoke('open-port-config')
});