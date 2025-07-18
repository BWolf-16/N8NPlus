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