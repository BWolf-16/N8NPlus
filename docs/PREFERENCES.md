# N8NPlus Application Preferences

## Overview

N8NPlus now includes a comprehensive preferences system that allows users to customize the application behavior for startup, container management, Docker connections, and user interface settings.

## Accessing Preferences

### Via Menu
- **File Menu** → **Application Preferences...** (Ctrl+,)
- **Servers Menu** → **Application Preferences...** (Ctrl+,)

### Via Keyboard Shortcut
- **Windows/Linux**: `Ctrl + ,`
- **macOS**: `Cmd + ,`

## Preference Categories

### 🚀 Startup Settings

#### Auto-run when PC starts
- **Description**: Start N8NPlus automatically when your computer boots
- **Default**: `false`
- **Platforms**: 
  - Windows: Creates startup shortcut
  - macOS: Uses login items
  - Linux: Creates autostart desktop entry

#### Auto-start servers on launch
- **Description**: Automatically start backend and frontend servers when app opens
- **Default**: `true`
- **Note**: When disabled, you'll need to manually start servers via menu

#### Minimize to system tray
- **Description**: Start minimized to system tray instead of showing window
- **Default**: `false`
- **Note**: Requires system tray support

### 🐳 Container Management

#### Stop containers when app closes
- **Description**: Automatically stop all running Docker containers when N8NPlus exits
- **Default**: `false`
- **Behavior**: Sends stop command to all containers across all connected Docker hosts

#### Stop servers when app closes
- **Description**: Stop backend and frontend servers when app exits
- **Default**: `true`
- **Note**: Ensures clean shutdown of N8NPlus services

#### Confirm before stopping containers
- **Description**: Show confirmation dialog before stopping containers
- **Default**: `true`
- **Note**: Only applies when container/server stopping is enabled

### 🔗 Docker Connection

#### Auto-connect to local Docker
- **Description**: Automatically connect to local Docker daemon on startup
- **Default**: `true`
- **Note**: Will attempt connection to local Docker on app launch

#### Show connection notifications
- **Description**: Display notifications when Docker connections succeed or fail
- **Default**: `true`
- **Note**: Shows system notifications for connection status

#### Retry failed connections
- **Description**: Automatically retry Docker connections if they fail
- **Default**: `true`
- **Note**: Implements exponential backoff for retries

### 🎨 User Interface

#### Show startup splash screen
- **Description**: Display loading screen while app initializes
- **Default**: `true`
- **Note**: Shows N8NPlus branding during startup

#### Minimize instead of close
- **Description**: Minimize to tray when clicking X button instead of exiting
- **Default**: `false`
- **Note**: Requires system tray support

#### Remember window size
- **Description**: Save and restore window size and position
- **Default**: `true`
- **Storage**: Saved in application preferences

#### Theme
- **Description**: Choose application color theme
- **Options**: 
  - `Auto (System)`: Follow system theme
  - `Light`: Always use light theme
  - `Dark`: Always use dark theme
- **Default**: `auto`

## File Storage

### Preferences File
- **Location**: `app-preferences.json` (in application root)
- **Format**: JSON
- **Backup**: Automatically backed up on changes

### Example Preferences File
```json
{
  "startup": {
    "autoRunOnPCStart": false,
    "autoStartServersOnLaunch": true,
    "minimizeToTray": false
  },
  "containers": {
    "stopContainersOnAppClose": false,
    "stopServersOnAppClose": true,
    "confirmBeforeStoppingContainers": true
  },
  "docker": {
    "autoConnectToLocal": true,
    "showConnectionNotifications": true,
    "retryFailedConnections": true
  },
  "ui": {
    "showStartupSplash": true,
    "minimizeOnClose": false,
    "rememberWindowSize": true,
    "theme": "auto"
  }
}
```

## API Integration

### Backend Endpoint
- **URL**: `POST /api/containers/stop-all`
- **Description**: Stops all containers across all connected Docker hosts
- **Response**: JSON with stop results and statistics

### IPC Events
- **save-app-preferences**: Save application preferences
- **load-app-preferences**: Load application preferences

## Platform-Specific Features

### Windows
- **Auto-start**: Creates shortcut in Startup folder
- **System Tray**: Full support with minimize to tray
- **Notifications**: Windows toast notifications

### macOS
- **Auto-start**: Uses `app.setLoginItemSettings()`
- **System Tray**: Native menu bar integration
- **Notifications**: Native notification center

### Linux
- **Auto-start**: Creates `.desktop` file in `~/.config/autostart/`
- **System Tray**: Depends on desktop environment
- **Notifications**: Uses libnotify when available

## Best Practices

### Recommended Settings for Development
```json
{
  "startup": {
    "autoRunOnPCStart": false,
    "autoStartServersOnLaunch": true,
    "minimizeToTray": false
  },
  "containers": {
    "stopContainersOnAppClose": false,
    "stopServersOnAppClose": true,
    "confirmBeforeStoppingContainers": true
  }
}
```

### Recommended Settings for Production
```json
{
  "startup": {
    "autoRunOnPCStart": true,
    "autoStartServersOnLaunch": true,
    "minimizeToTray": true
  },
  "containers": {
    "stopContainersOnAppClose": true,
    "stopServersOnAppClose": true,
    "confirmBeforeStoppingContainers": false
  }
}
```

## Troubleshooting

### Auto-start Not Working
1. Check if application has necessary permissions
2. Verify shortcut/desktop entry was created
3. Check system startup settings

### Container Stop Issues
1. Verify Docker connections are active
2. Check container permissions
3. Review backend logs for errors

### Preferences Not Saving
1. Check write permissions to application directory
2. Verify `app-preferences.json` file permissions
3. Check available disk space

## Security Considerations

- Preferences file contains no sensitive information
- Auto-start shortcuts use absolute paths
- Docker commands require existing authentication
- No elevation required for preference changes

## Migration

If upgrading from a previous version:
1. Preferences will be created with defaults on first run
2. Existing port preferences remain unchanged
3. No manual migration required
