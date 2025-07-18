# 🔄 Auto-Update Workflow Guide

## How Updates Work Automatically

### 1. **When You Release Updates**

#### Update Your Code
```bash
# Make your changes, then:
git add .
git commit -m "Add new feature"
git push
```

#### Bump Version
```bash
# Update version in package.json (example: 1.0.0 → 1.0.1)
# Then build and publish:
npm run publish
```

#### What Happens Behind the Scenes:
- Electron-builder creates installers for all platforms
- Uploads them to GitHub releases automatically
- Creates release with version tag (v1.0.1)
- Updates `latest.yml` files for auto-updater

### 2. **When Users Launch Your App**

#### Automatic Check (10 seconds after startup)
```javascript
// Your auto-updater checks GitHub:
autoUpdater.checkForUpdatesAndNotify();
```

#### What the User Sees:
1. **App starts normally** 📱
2. **10 seconds later** → Background check for updates
3. **If update found** → Notification appears: "Update available!"
4. **User clicks "Download"** → Progress bar shows download
5. **Download complete** → "Restart to install update"
6. **User restarts** → Update applied automatically ✅

### 3. **User Experience Flow**

```
App Launch → Background Check → Update Found → Download → Install → Done!
     ↓              ↓              ↓           ↓         ↓        ↓
  Normal use    (10 sec delay)  Notification  Progress  Restart  Updated!
```

## 🎯 **Example Update Scenario**

### Version 1.0.0 → 1.0.1

#### You (Developer):
1. Fix a bug or add feature
2. Change version in `package.json`: `"version": "1.0.1"`
3. Run: `npm run publish`
4. GitHub release created automatically

#### User Experience:
1. User has v1.0.0 installed
2. User opens N8NPlus app
3. After 10 seconds: **"🎉 Update available! Version 1.0.1"**
4. User clicks **"Download Now"**
5. **"⬇️ Downloading update: 45%"** (progress shown)
6. **"✅ Update downloaded! Restart to install?"**
7. User clicks **"Restart Now"**
8. App restarts with v1.0.1 automatically

### No User Action Required!
- ✅ No manual downloads
- ✅ No installer hunting
- ✅ No uninstall/reinstall
- ✅ Settings and data preserved
- ✅ One-click update process

## 🔧 **Publishing Commands**

### Manual Release Process:
```bash
# 1. Update version in package.json
# 2. Build and publish
npm run publish        # All platforms
npm run publish-win    # Windows only
npm run publish-mac    # macOS only
npm run publish-linux  # Linux only
```

### What Gets Published:
- **Windows**: `N8NPlus Setup 1.0.1.exe` + portable version
- **macOS**: `N8NPlus-1.0.1.dmg` + ZIP package
- **Linux**: AppImage, DEB, RPM packages
- **Update metadata**: `latest.yml`, `latest-mac.yml`, `latest-linux.yml`

## 🎮 **Testing the Update System**

### Test Scenario:
1. Build v1.0.0 → Install on test machine
2. Update to v1.0.1 → Publish to GitHub
3. Launch v1.0.0 app → Should detect and offer v1.0.1
4. Accept update → Should download and install automatically

### Development Testing:
```bash
# Disable auto-update in development
ELECTRON_IS_DEV=true npm start

# Enable auto-update testing
npm run electron
```

## 🚀 **Best Practices**

### Version Numbering:
- **Major**: `1.0.0 → 2.0.0` (breaking changes)
- **Minor**: `1.0.0 → 1.1.0` (new features)
- **Patch**: `1.0.0 → 1.0.1` (bug fixes)

### Release Notes:
- Write clear changelog in GitHub releases
- Users can click "View Release Notes" in update dialog
- Helps users understand what's new

### Update Frequency:
- **Critical bugs**: Immediate patch releases
- **Features**: Regular minor releases
- **Major changes**: Planned major releases

---

## ✨ **The Magic**

Once set up, this system is **completely automatic**:

1. **You**: Code → Version bump → Publish
2. **System**: Builds → Uploads → Notifies users
3. **Users**: One-click updates → Always current version

**Your users will always have the latest version with zero effort!** 🎉
