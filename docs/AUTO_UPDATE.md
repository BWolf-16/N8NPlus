# Auto-Update System

N8NPlus includes a comprehensive auto-update system that automatically checks for and installs updates from GitHub releases.

## Features

### ✨ Automatic Update Detection
- Checks for updates on app startup (10-second delay)
- Manual update checks via Help menu
- Background update monitoring

### 🚀 User-Friendly Update Process
- Update available notifications with download prompts
- Progress tracking during downloads
- Restart prompts when updates are ready
- Option to view release notes

### 🔧 Cross-Platform Support
- Windows: NSIS installer updates
- macOS: DMG and ZIP package updates  
- Linux: AppImage, DEB, and RPM updates

### 🛡️ Security & Reliability
- Code signing validation (when certificates are configured)
- Automatic rollback on failed updates
- Comprehensive error handling and logging

## How It Works

### Update Check Process
1. **Startup Check**: 10 seconds after app launch
2. **Manual Check**: Via Help → Check for Updates menu
3. **GitHub Integration**: Checks GitHub releases API
4. **Version Comparison**: Compares current vs latest version

### Update Flow
```
Check for Updates → Update Available → Download → Install → Restart
```

### User Experience
- **Non-intrusive**: Updates don't interrupt workflow
- **Optional**: Users can choose when to install
- **Informative**: Clear status messages and progress
- **Accessible**: Available via menu and notifications

## Configuration

### GitHub Publishing
Updates are published to GitHub releases using electron-builder:

```bash
# Publish all platforms
npm run publish

# Platform-specific publishing
npm run publish-win    # Windows
npm run publish-mac    # macOS  
npm run publish-linux  # Linux
```

### Auto-Update Settings
- **Auto-download**: Disabled (asks user first)
- **Auto-install**: Enabled on app quit
- **Update channel**: Release (stable)
- **Check frequency**: On startup + manual

## User Interface

### Update Notifications
- **Top-right corner**: Non-blocking notifications
- **Color-coded**: Status-based visual feedback
- **Dismissible**: Users can close notifications
- **Auto-hide**: Non-critical messages auto-dismiss

### Menu Integration
- **Help Menu**: "Check for Updates" option
- **About Dialog**: Shows current version
- **Keyboard Shortcuts**: Quick access to functions

## Development

### Testing Updates
1. Build and publish a test release
2. Install previous version locally
3. Launch app to trigger update check
4. Verify update flow works correctly

### Release Process
1. Update version in `package.json`
2. Create GitHub release with tag
3. Run `npm run publish` to build and upload
4. Auto-updater will detect new release

### Logging
All update events are logged using electron-log:
- Update checks and results
- Download progress
- Installation status
- Error conditions

## Troubleshooting

### Common Issues
- **No updates found**: Check GitHub release tags
- **Download fails**: Verify internet connection
- **Install fails**: Check permissions and disk space
- **Menu missing**: Restart app to refresh menu

### Debug Information
Update logs are available in:
- **Windows**: `%USERPROFILE%\\AppData\\Roaming\\n8nplus\\logs\\`
- **macOS**: `~/Library/Logs/n8nplus/`
- **Linux**: `~/.config/n8nplus/logs/`

## Security Considerations

### Code Signing
For production releases, configure code signing:
- **Windows**: Authenticode certificate
- **macOS**: Apple Developer certificate  
- **Linux**: GPG signing (optional)

### Update Validation
- Checksum verification
- Signature validation
- Source verification (GitHub only)

## Future Enhancements

### Planned Features
- **Update channels**: Beta/alpha update tracks
- **Selective updates**: Choose which updates to install
- **Bandwidth control**: Limit download speed
- **Offline updates**: Manual update file installation
- **Update scheduling**: Set preferred update times

---

*The auto-update system ensures N8NPlus stays current with the latest features, security patches, and improvements automatically.*
