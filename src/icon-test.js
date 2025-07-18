#!/usr/bin/env node

/**
 * Quick Icon Test - Shows what icon will be used by the Electron app
 */

const fs = require('fs');
const path = require('path');

function testIconSelection() {
  const assetsPath = path.join(__dirname, '..', 'assets');
  const platform = process.platform;
  
  console.log('🎨 N8NPlus Icon Selection Test');
  console.log('===============================');
  console.log(`Platform: ${platform}`);
  console.log(`Assets path: ${assetsPath}`);
  console.log('');
  
  // Platform-specific icon preferences
  let iconCandidates = [];
  
  switch (platform) {
    case 'win32':
      iconCandidates = ['icon.ico', 'icon.png', 'icon.svg'];
      console.log('Windows icon priority: .ico → .png → .svg → default');
      break;
    case 'darwin':
      iconCandidates = ['icon.icns', 'icon.png', 'icon.svg'];
      console.log('macOS icon priority: .icns → .png → .svg → default');
      break;
    default:
      iconCandidates = ['icon.png', 'icon.svg'];
      console.log('Linux icon priority: .png → .svg → default');
      break;
  }
  
  console.log('');
  
  // Check if assets directory exists
  if (!fs.existsSync(assetsPath)) {
    console.log('❌ Assets directory not found');
    console.log('🔧 Will be created on first run');
    console.log('📌 Result: Default Electron icon will be used');
    return;
  }
  
  console.log('✅ Assets directory found');
  console.log('');
  
  let selectedIcon = null;
  
  // Check each icon candidate
  for (let i = 0; i < iconCandidates.length; i++) {
    const iconFile = iconCandidates[i];
    const iconPath = path.join(assetsPath, iconFile);
    const priority = i + 1;
    
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      const size = (stats.size / 1024).toFixed(2);
      
      if (!selectedIcon) {
        selectedIcon = { file: iconFile, path: iconPath, size };
        console.log(`🎯 SELECTED: ${iconFile} (${size} KB) - Priority ${priority}`);
      } else {
        console.log(`✅ Available: ${iconFile} (${size} KB) - Priority ${priority}`);
      }
    } else {
      console.log(`❌ Missing: ${iconFile} - Priority ${priority}`);
    }
  }
  
  console.log('');
  
  if (selectedIcon) {
    console.log(`📌 Result: ${selectedIcon.file} will be used as the app icon`);
    console.log(`📍 Path: ${selectedIcon.path}`);
  } else {
    console.log('📌 Result: Default Electron icon will be used');
    console.log('💡 Tip: Run "npm run icon-check" for setup instructions');
  }
}

if (require.main === module) {
  testIconSelection();
}

module.exports = testIconSelection;
