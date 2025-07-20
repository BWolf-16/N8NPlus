const fs = require('fs');
const path = require('path');

console.log('🚀 N8NPlus v1.0.4 Release Preparation');
console.log('=====================================\n');

// Check current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Current version: ${packageJson.version}`);

if (packageJson.version !== '1.0.4') {
    console.log('❌ Version mismatch! Expected 1.0.4, got', packageJson.version);
    console.log('Please update package.json version to 1.0.4');
    process.exit(1);
}

// Check if required files exist
const requiredFiles = [
    'main.js',
    'preload.js',
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'GITHUB_RELEASE_v1.0.4.md',
    'CHANGELOG.md',
    'AUTOMATIC_STARTUP.md',
    'BUILD_INSTRUCTIONS.md'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} - Missing!`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please ensure all files are present.');
    process.exit(1);
}

// Check if icon files exist
console.log('\n🎨 Checking icon files...');
const iconFiles = ['assets/icon.png', 'assets/icon.ico', 'assets/icon.icns'];
let hasIcons = false;

iconFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
        hasIcons = true;
    } else {
        console.log(`  ⚠️  ${file} - Optional`);
    }
});

if (!hasIcons) {
    console.log('  💡 Consider adding icon files for better branding');
}

// Create release checklist
console.log('\n📝 Release Checklist:');
console.log('========================');

const checklist = [
    'Update version to 1.0.4 in package.json ✅',
    'Update version in loading.html ✅',
    'Create release notes (GITHUB_RELEASE_v1.0.4.md) ✅',
    'Update changelog (CHANGELOG.md) ✅',
    'Create build instructions ✅',
    'Test automatic startup functionality',
    'Build for all platforms (Windows/macOS/Linux)',
    'Test built applications on target platforms',
    'Create GitHub release with tag v1.0.4',
    'Upload built binaries to GitHub release',
    'Publish release'
];

checklist.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item}`);
});

// Build commands summary
console.log('\n🛠️  Build Commands:');
console.log('==================');
console.log('Windows:   npm run build-win     (or run build-release.bat)');
console.log('macOS:     npm run build-mac     (or run build-release.sh)');
console.log('Linux:     npm run build-linux   (or run build-release.sh)');
console.log('All:       npm run build-all     (requires all platforms)');

// Expected output files
console.log('\n📤 Expected Output Files:');
console.log('=========================');
console.log('Windows:   dist/N8NPlus-1.0.4-win.exe');
console.log('macOS:     dist/N8NPlus-1.0.4-mac.dmg');
console.log('Linux:     dist/N8NPlus-1.0.4-linux.AppImage');

// GitHub release info
console.log('\n🌐 GitHub Release Information:');
console.log('==============================');
console.log('Repository: BWolf-16/N8NPlus');
console.log('Tag: v1.0.4');
console.log('Title: 🚀 N8NPlus v1.0.4 - Automatic Startup Revolution');
console.log('Description: Use content from GITHUB_RELEASE_v1.0.4.md');

console.log('\n✅ Release preparation complete!');
console.log('Ready to build and upload N8NPlus v1.0.4');

// Create a quick reference file
const quickRef = `# N8NPlus v1.0.4 Release Quick Reference

## Build Commands
- Windows: \`npm run build-win\` or \`build-release.bat\`
- macOS: \`npm run build-mac\` or \`./build-release.sh\`
- Linux: \`npm run build-linux\` or \`./build-release.sh\`

## Output Files
- Windows: \`dist/N8NPlus-1.0.4-win.exe\`
- macOS: \`dist/N8NPlus-1.0.4-mac.dmg\`
- Linux: \`dist/N8NPlus-1.0.4-linux.AppImage\`

## GitHub Release
- Tag: \`v1.0.4\`
- Title: \`🚀 N8NPlus v1.0.4 - Automatic Startup Revolution\`
- Description: Copy from \`GITHUB_RELEASE_v1.0.4.md\`

## Upload Checklist
- [ ] Upload Windows executable
- [ ] Upload macOS DMG
- [ ] Upload Linux AppImage
- [ ] Set as latest release
- [ ] Publish release
`;

fs.writeFileSync('RELEASE_QUICK_REF.md', quickRef);
console.log('\n📄 Created RELEASE_QUICK_REF.md for easy reference');
