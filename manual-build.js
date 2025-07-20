const builder = require('electron-builder');
const path = require('path');

console.log('🚀 Starting N8NPlus v1.0.4 build...');

async function buildApp() {
  try {
    console.log('📦 Building Windows executable...');
    
    const result = await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(),
      config: {
        appId: 'com.bwolf16.n8nplus',
        productName: 'N8NPlus',
        directories: {
          output: 'dist',
          buildResources: 'assets'
        },
        files: [
          'main.js',
          'preload.js',
          'loading.html',
          'package.json',
          'src/**/*',
          'backend/**/*',
          'frontend/build/**/*',
          'assets/icon.*'
        ],
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          allowElevation: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true
        }
      }
    });
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Output files are in the dist/ directory');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildApp();
