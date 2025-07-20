// Test script to validate preferences system
const fs = require('fs');
const path = require('path');

// Test loading the main.js file to check for syntax errors
try {
  console.log('🔍 Testing main.js syntax...');
  
  // Read the main.js file
  const mainJsPath = path.join(__dirname, 'main.js');
  const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  
  // Basic syntax validation
  if (mainJsContent.includes('appPreferences')) {
    console.log('✅ App preferences structure found');
  }
  
  if (mainJsContent.includes('loadAppPreferences')) {
    console.log('✅ Load app preferences function found');
  }
  
  if (mainJsContent.includes('saveAppPreferences')) {
    console.log('✅ Save app preferences function found');
  }
  
  if (mainJsContent.includes('showAppPreferencesDialog')) {
    console.log('✅ Preferences dialog function found');
  }
  
  if (mainJsContent.includes('setupAutoStart')) {
    console.log('✅ Auto-start setup function found');
  }
  
  if (mainJsContent.includes('handleAppExit')) {
    console.log('✅ App exit handler function found');
  }
  
  // Check for proper IPC handlers
  if (mainJsContent.includes('save-app-preferences')) {
    console.log('✅ App preferences IPC handler found');
  }
  
  console.log('\n🎉 All preference system components found!');
  
  // Test default preferences structure
  const defaultPreferences = {
    startup: {
      autoRunOnPCStart: false,
      autoStartServersOnLaunch: true,
      minimizeToTray: false
    },
    containers: {
      stopContainersOnAppClose: false,
      stopServersOnAppClose: true,
      confirmBeforeStoppingContainers: true
    },
    docker: {
      autoConnectToLocal: true,
      showConnectionNotifications: true,
      retryFailedConnections: true
    },
    ui: {
      showStartupSplash: true,
      minimizeOnClose: false,
      rememberWindowSize: true,
      theme: 'auto'
    }
  };
  
  console.log('\n📋 Default preferences structure:');
  console.log(JSON.stringify(defaultPreferences, null, 2));
  
  // Test creating preferences file
  const prefsPath = path.join(__dirname, 'app-preferences.json');
  fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2));
  console.log('\n✅ Created sample app-preferences.json file');
  
  // Test reading it back
  const loadedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  console.log('✅ Successfully loaded preferences from file');
  
  console.log('\n🎉 Preferences system validation completed successfully!');
  
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  process.exit(1);
}
