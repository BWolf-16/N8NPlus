# Testing the New N8NPlus Preferences System

## 🎉 Your App is Now Running!

The N8NPlus application is successfully running with the new comprehensive preferences system. Here's how to test all the new features:

## 🔧 Testing the Preferences Dialog

### Access the Preferences:
1. **Via Keyboard**: Press `Ctrl + ,` (comma)
2. **Via Menu**: 
   - Go to **Servers** → **Application Preferences...**
   - Or **File** → **Application Preferences...**

### Test Each Category:

#### 🚀 Startup Settings
- **Auto-run when PC starts**: Toggle this to test auto-startup functionality
- **Auto-start servers on launch**: Try disabling this, restart the app, and see if servers auto-start
- **Minimize to system tray**: Enable for background operation

#### 🐳 Container Management  
- **Stop containers when app closes**: Enable this to test automatic container cleanup
- **Stop servers when app closes**: Controls whether backend/frontend stop on exit
- **Confirm before stopping containers**: Toggle to test confirmation dialogs

#### 🔗 Docker Connection
- **Auto-connect to local Docker**: Test Docker connection behavior
- **Show connection notifications**: Enable for visual feedback
- **Retry failed connections**: Test resilient connection handling

#### 🎨 User Interface
- **Show startup splash screen**: Test loading screen display
- **Minimize instead of close**: Test tray behavior
- **Remember window size**: Resize window and restart to test
- **Theme**: Switch between Auto/Light/Dark (future feature)

## 🧪 Testing Scenarios

### Scenario 1: Auto-Start Testing
1. Open Preferences (`Ctrl + ,`)
2. Enable "Auto-run when PC starts"
3. Click "Save Preferences"
4. Check Windows Startup folder: `Win + R` → `shell:startup`
5. Look for "N8NPlus.lnk" shortcut

### Scenario 2: Container Cleanup Testing
1. Start some Docker containers in the app
2. Open Preferences (`Ctrl + ,`)
3. Enable "Stop containers when app closes"
4. Enable "Confirm before stopping containers"
5. Close the app and watch for confirmation dialog

### Scenario 3: Server Auto-Start Testing
1. Open Preferences (`Ctrl + ,`)
2. Disable "Auto-start servers on launch"
3. Close and restart the app
4. Observe that servers don't auto-start
5. Manually start servers via menu

### Scenario 4: Port Configuration Testing
1. Go to **Servers** → **Configure Ports...**
2. Change port preferences
3. Restart servers to test new ports
4. Verify the flexible port system works

## 🔍 Expected Behaviors

### On Startup:
- ✅ Backend starts on port 9999 (or next available)
- ✅ Frontend starts on port 8880 (or next available)  
- ✅ Docker connects to local daemon
- ✅ Preferences are loaded from `app-preferences.json`
- ✅ Auto-start behavior respects user settings

### On Exit:
- ✅ Confirmation dialog appears (if enabled)
- ✅ Containers stop across all hosts (if enabled)
- ✅ Servers stop gracefully (if enabled)
- ✅ Preferences are saved

### In Preferences Dialog:
- ✅ Current settings are displayed correctly
- ✅ Changes are applied immediately or on restart
- ✅ Reset to defaults works
- ✅ All 16 preferences are functional

## 📁 Files to Check

### Generated Files:
- `app-preferences.json` - Your user preferences
- `port-preferences.json` - Port configuration
- Windows: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\N8NPlus.lnk`

### Log Output:
- Check console for preference loading messages
- Look for "📋 Loaded app preferences" messages
- Watch for auto-start setup confirmations

## 🎯 Key Features Implemented

✅ **16 User Preferences** across 4 categories
✅ **Cross-Platform Auto-Start** (Windows/macOS/Linux)
✅ **Intelligent Container Management** with multi-host support
✅ **Modern Preferences Dialog** with organized sections
✅ **Graceful App Exit** with user confirmation
✅ **Persistent Settings** with JSON storage
✅ **Backend API Enhancement** for container control
✅ **Menu Integration** with keyboard shortcuts
✅ **Error Handling** and safety features

## 💡 Tips for Testing

1. **Test with Different Combinations**: Try various preference combinations to see how they interact
2. **Test Platform Features**: The auto-start works differently on Windows vs macOS vs Linux
3. **Test Network Scenarios**: Try with multiple Docker hosts
4. **Test Error Conditions**: What happens if preferences file is corrupted?
5. **Test Performance**: Does the app start faster/slower with different settings?

## 🐛 What to Look For

### Good Signs:
- Preferences dialog opens quickly
- Settings persist after restart
- Auto-start works on reboot
- Container cleanup works as expected
- No console errors

### Potential Issues:
- Preferences not saving
- Auto-start permission issues
- Container stop failures
- Dialog not showing correct values

## 🎉 Enjoy Your Enhanced N8NPlus!

Your application now has enterprise-grade preferences management. Users can customize the behavior to match their workflow, whether they're developers, system administrators, or end users.

The system is designed to be:
- **User-Friendly**: Clear descriptions and logical organization
- **Robust**: Error handling and safe defaults
- **Flexible**: Works across different platforms and use cases
- **Professional**: Modern UI and comprehensive functionality
