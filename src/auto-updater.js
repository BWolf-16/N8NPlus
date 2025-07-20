const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const log = require('electron-log');

class AutoUpdater {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupLogging();
        this.setupAutoUpdater();
    }

    setupLogging() {
        // Configure logging for auto-updater
        autoUpdater.logger = log;
        autoUpdater.logger.transports.file.level = 'info';
        log.info('Auto-updater initialized');
    }

    setupAutoUpdater() {
        // Configure auto-updater for GitHub releases
        if (this.isPackaged()) {
            autoUpdater.setFeedURL({
                provider: 'github',
                owner: 'BWolf-16',
                repo: 'N8NPlus',
                releaseType: 'release'
            });
        }

        // Auto-updater event handlers
        autoUpdater.on('checking-for-update', () => {
            log.info('Checking for update...');
            this.sendStatusToWindow('Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            log.info('Update available:', info);
            this.sendStatusToWindow('Update available');
            this.showUpdateAvailableDialog(info);
        });

        autoUpdater.on('update-not-available', (info) => {
            log.info('Update not available:', info);
            this.sendStatusToWindow('App is up to date');
        });

        autoUpdater.on('error', (err) => {
            log.error('Error in auto-updater:', err);
            
            // Provide more specific error handling
            if (err.message && err.message.includes('ENOTFOUND')) {
                this.sendStatusToWindow('No internet connection for updates');
                log.info('Update check failed: No internet connection');
            } else if (err.message && err.message.includes('404')) {
                this.sendStatusToWindow('No releases found - app is up to date');
                log.info('Update check: No releases published yet');
            } else if (err.message && err.message.includes('CERT')) {
                this.sendStatusToWindow('Certificate error - update check failed');
                log.info('Update check failed: Certificate issue');
            } else {
                this.sendStatusToWindow('Error checking for updates');
                log.error('Update check failed with error:', err.message);
            }
            
            // Don't show error dialog for development builds
            if (!this.isPackaged()) {
                log.info('Skipping error dialog in development mode');
                return;
            }
        });

        autoUpdater.on('download-progress', (progressObj) => {
            let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
            logMessage += ` - Downloaded ${progressObj.percent}%`;
            logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
            log.info(logMessage);
            this.sendStatusToWindow(`Downloading update: ${Math.round(progressObj.percent)}%`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            log.info('Update downloaded:', info);
            this.sendStatusToWindow('Update downloaded');
            this.showUpdateDownloadedDialog();
        });

        // Configure update settings
        autoUpdater.autoDownload = false; // Don't auto-download, ask user first
        autoUpdater.autoInstallOnAppQuit = true; // Install when app quits
    }

    sendStatusToWindow(text) {
        log.info(text);
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send('update-status', text);
        }
    }

    // Check if app is packaged (production) or running in development
    isPackaged() {
        return require('electron').app.isPackaged;
    }

    // Check internet connectivity
    async checkInternetConnection() {
        const net = require('net');
        return new Promise((resolve) => {
            const socket = net.createConnection({ port: 443, host: 'github.com' });
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.setTimeout(5000, () => {
                socket.destroy();
                resolve(false);
            });
        });
    }

    async showUpdateAvailableDialog(info) {
        const response = await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available!`,
            detail: 'Would you like to download and install it now?',
            buttons: ['Download Now', 'Later', 'View Release Notes'],
            defaultId: 0,
            cancelId: 1
        });

        if (response.response === 0) {
            // Download now
            autoUpdater.downloadUpdate();
            this.sendStatusToWindow('Downloading update...');
        } else if (response.response === 2) {
            // View release notes
            const { shell } = require('electron');
            await shell.openExternal(`https://github.com/BWolf-16/N8NPlus/releases/tag/v${info.version}`);
        }
    }

    async showUpdateDownloadedDialog() {
        const response = await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded successfully!',
            detail: 'The application will restart to apply the update.',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        });

        if (response.response === 0) {
            autoUpdater.quitAndInstall();
        }
    }

    // Manual check for updates (called from menu or UI)
    checkForUpdates() {
        log.info('Manual update check triggered');
        
        // Skip update check in development mode
        if (!this.isPackaged()) {
            log.info('Skipping update check in development mode');
            this.sendStatusToWindow('Update check disabled in development mode');
            return {
                success: false,
                message: 'Update checking is disabled in development mode'
            };
        }
        
        // Check for internet connectivity first
        this.checkInternetConnection().then(connected => {
            if (!connected) {
                this.sendStatusToWindow('No internet connection for updates');
                log.info('Update check failed: No internet connection');
                return;
            }
            
            try {
                autoUpdater.checkForUpdatesAndNotify();
            } catch (error) {
                log.error('Failed to check for updates:', error);
                this.sendStatusToWindow('Failed to check for updates');
            }
        }).catch(error => {
            log.error('Error checking internet connection:', error);
            this.sendStatusToWindow('Network error - cannot check for updates');
        });
        
        return {
            success: true,
            message: 'Checking for updates...'
        };
    }

    // Debug method to test update checking
    debugUpdateCheck() {
        log.info('=== DEBUG: Update Check ===');
        log.info('App version:', require('../package.json').version);
        log.info('Is packaged:', this.isPackaged());
        log.info('GitHub repo: BWolf-16/N8NPlus');
        
        if (!this.isPackaged()) {
            log.info('DEBUG: In development mode, update check disabled');
            return {
                success: false,
                message: 'Development mode - updates disabled'
            };
        }
        
        // Force a check regardless of connectivity
        try {
            autoUpdater.checkForUpdatesAndNotify();
            return {
                success: true,
                message: 'Debug update check initiated'
            };
        } catch (error) {
            log.error('DEBUG: Update check failed:', error);
            return {
                success: false,
                message: 'Debug update check failed'
            };
        }
    }

    // Check for updates on app startup (with delay)
    checkForUpdatesOnStartup() {
        // Skip update check in development mode
        if (!this.isPackaged()) {
            log.info('Skipping startup update check in development mode');
            return;
        }
        
        // Wait 10 seconds after startup to check for updates
        setTimeout(() => {
            log.info('Checking for updates on startup');
            
            this.checkInternetConnection().then(connected => {
                if (!connected) {
                    log.info('Startup update check: No internet connection');
                    return;
                }
                
                try {
                    autoUpdater.checkForUpdatesAndNotify();
                } catch (error) {
                    log.error('Startup update check failed:', error);
                }
            }).catch(error => {
                log.error('Error during startup update check:', error);
            });
        }, 10000);
    }
}

module.exports = AutoUpdater;
