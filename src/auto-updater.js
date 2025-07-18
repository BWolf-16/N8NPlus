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
            this.sendStatusToWindow('Error checking for updates');
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
        autoUpdater.checkForUpdatesAndNotify();
    }

    // Check for updates on app startup (with delay)
    checkForUpdatesOnStartup() {
        // Wait 10 seconds after startup to check for updates
        setTimeout(() => {
            log.info('Checking for updates on startup');
            autoUpdater.checkForUpdatesAndNotify();
        }, 10000);
    }
}

module.exports = AutoUpdater;
