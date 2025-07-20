const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 N8NPlus v1.0.4 Manual Build Script');
console.log('=====================================');

// Clean dist folder
if (fs.existsSync('dist')) {
    console.log('[INFO] Cleaning dist folder...');
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('[SUCCESS] Cleaned dist folder');
}

// Path to electron-builder
const electronBuilderPath = path.join(__dirname, 'node_modules', '.bin', 'electron-builder');
const electronBuilderCmd = process.platform === 'win32' ? electronBuilderPath + '.cmd' : electronBuilderPath;

console.log('[INFO] Starting build process...');
console.log('[INFO] This may take 5-10 minutes...');

// Build for Windows
const buildProcess = spawn(electronBuilderCmd, ['--win', '--x64'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
});

buildProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n[SUCCESS] ✅ Build completed successfully!');
        
        // List built files
        if (fs.existsSync('dist')) {
            console.log('\n[INFO] Built files:');
            const files = fs.readdirSync('dist');
            files.forEach(file => {
                const filePath = path.join('dist', file);
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                console.log(`  📦 ${file} (${sizeMB} MB)`);
            });
        }
        
        console.log('\n[INFO] Files ready for GitHub upload!');
    } else {
        console.log(`\n[ERROR] ❌ Build failed with code ${code}`);
        console.log('\n[INFO] Try these solutions:');
        console.log('1. Run: npm install');
        console.log('2. Run: npm run build-frontend');
        console.log('3. Run: npx electron-builder --win');
    }
});

buildProcess.on('error', (err) => {
    console.log(`\n[ERROR] ❌ Build process error: ${err.message}`);
    console.log('\n[INFO] Alternative: Try running manually:');
    console.log('npx electron-builder --win --x64');
});
