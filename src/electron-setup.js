const { ipcMain, dialog, shell } = require('electron');
const os = require('os');
const DependencyChecker = require('./dependency-checker');
const SetupManager = require('./setup-manager');

class ElectronSetupIntegration {
  constructor() {
    this.checker = new DependencyChecker();
    this.setupManager = new SetupManager();
    this.platform = os.platform();
    this.setupIpcHandlers();
  }

  getPlatformUrls() {
    const urls = {
      win32: {
        docker: 'https://www.docker.com/products/docker-desktop/',
        git: 'https://git-scm.com/download/win',
        node: 'https://nodejs.org/en/download/'
      },
      darwin: {
        docker: 'https://www.docker.com/products/docker-desktop/',
        git: 'https://git-scm.com/download/mac',
        node: 'https://nodejs.org/en/download/'
      },
      linux: {
        docker: 'https://docs.docker.com/engine/install/',
        git: 'https://git-scm.com/download/linux',
        node: 'https://nodejs.org/en/download/package-manager/'
      }
    };
    
    return urls[this.platform] || urls.linux;
  }

  setupIpcHandlers() {
    // Check dependencies from renderer process
    ipcMain.handle('check-dependencies', async () => {
      try {
        const results = await this.checker.checkAll();
        const report = await this.checker.generateReport(results);
        return { success: true, results, report };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Auto-install missing dependencies
    ipcMain.handle('auto-install-dependencies', async () => {
      try {
        const results = await this.checker.checkAll();
        const report = await this.checker.generateReport(results);
        
        if (report.hasIssues) {
          const success = await this.checker.fixIssues(report.missing, report.outdated);
          return { success, installed: [...report.missing, ...report.outdated] };
        }
        
        return { success: true, installed: [] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Show setup dialog
    ipcMain.handle('show-setup-dialog', async (event, issues) => {
      let platformInfo = '';
      
      switch (this.platform) {
        case 'win32':
          platformInfo = 'Windows';
          break;
        case 'darwin':
          platformInfo = 'macOS';
          break;
        case 'linux':
          platformInfo = 'Linux';
          break;
        default:
          platformInfo = this.platform;
      }
      
      const response = await dialog.showMessageBox({
        type: 'warning',
        title: 'Dependencies Required',
        message: `N8NPlus requires additional software to run properly on ${platformInfo}.`,
        detail: `Missing or outdated: ${issues.join(', ')}\n\nWould you like to install them automatically?`,
        buttons: ['Install Automatically', 'Install Manually', 'Cancel'],
        defaultId: 0,
        cancelId: 2
      });

      return response.response;
    });

    // Open manual installation links
    ipcMain.handle('open-manual-install', async (event, dependency) => {
      const urls = this.getPlatformUrls();

      if (urls[dependency]) {
        shell.openExternal(urls[dependency]);
        return true;
      }
      return false;
    });

    // Check if Docker is running
    ipcMain.handle('check-docker-status', async () => {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync('docker info');
        return { running: true };
      } catch (error) {
        return { running: false, error: error.message };
      }
    });

    // Start Docker Desktop
    ipcMain.handle('start-docker', async () => {
      try {
        const success = await this.checker.startDockerDesktop();
        return { success };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
}

module.exports = ElectronSetupIntegration;
