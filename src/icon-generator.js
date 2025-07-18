const fs = require('fs');
const path = require('path');

/**
 * Icon Generator Script for N8NPlus
 * 
 * This script helps generate platform-specific icons from the base SVG.
 * Note: This requires external tools to be installed for full functionality.
 */

class IconGenerator {
  constructor() {
    this.assetsPath = path.join(__dirname, '..', 'assets');
    this.svgPath = path.join(this.assetsPath, 'icon.svg');
  }

  async checkSVGExists() {
    if (!fs.existsSync(this.svgPath)) {
      console.error('❌ icon.svg not found in assets folder');
      return false;
    }
    console.log('✅ Found icon.svg');
    return true;
  }

  async checkAvailableIcons() {
    console.log('\n🔍 Checking available icon files:');
    
    const iconFiles = [
      { name: 'icon.ico', desc: 'Windows icon', platforms: ['Windows'] },
      { name: 'icon.png', desc: 'Cross-platform PNG', platforms: ['Windows', 'macOS', 'Linux'] },
      { name: 'icon.icns', desc: 'macOS icon', platforms: ['macOS'] },
      { name: 'icon.svg', desc: 'Vector icon (fallback)', platforms: ['All (fallback)'] }
    ];

    const availableIcons = [];
    const missingIcons = [];

    for (const icon of iconFiles) {
      const iconPath = path.join(this.assetsPath, icon.name);
      if (fs.existsSync(iconPath)) {
        console.log(`✅ ${icon.name} - ${icon.desc} (${icon.platforms.join(', ')})`);
        availableIcons.push(icon);
      } else {
        console.log(`❌ ${icon.name} - ${icon.desc} (${icon.platforms.join(', ')})`);
        missingIcons.push(icon);
      }
    }

    return { availableIcons, missingIcons };
  }

  async generateInstructions() {
    console.log('\n📋 Icon Generation Instructions:');
    console.log('=====================================');
    
    console.log('\n🔧 Method 1: Online Converters (Easiest)');
    console.log('1. Go to https://convertio.co/svg-png/ or similar');
    console.log('2. Upload assets/icon.svg');
    console.log('3. Set size to 256x256 pixels');
    console.log('4. Download as PNG and save as assets/icon.png');
    console.log('5. For Windows: Convert PNG to ICO at https://convertio.co/png-ico/');
    
    console.log('\n🛠️ Method 2: Command Line Tools');
    console.log('Prerequisites:');
    console.log('- ImageMagick: https://imagemagick.org/script/download.php');
    console.log('- Inkscape: https://inkscape.org/release/ (for SVG conversion)');
    
    console.log('\nCommands:');
    console.log('# Convert SVG to PNG (256x256)');
    console.log('inkscape --export-type=png --export-width=256 --export-height=256 assets/icon.svg -o assets/icon.png');
    
    console.log('\n# Convert PNG to ICO (Windows)');
    console.log('magick assets/icon.png -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico');
    
    console.log('\n# Convert PNG to ICNS (macOS)');
    console.log('# (This requires macOS with iconutil)');
    console.log('mkdir icon.iconset');
    console.log('sips -z 256 256 assets/icon.png --out icon.iconset/icon_256x256.png');
    console.log('iconutil -c icns icon.iconset -o assets/icon.icns');
    
    console.log('\n🎨 Method 3: Manual Creation');
    console.log('1. Open assets/icon.svg in any vector graphics editor (Inkscape, Illustrator, etc.)');
    console.log('2. Export as PNG at 256x256 resolution');
    console.log('3. Use online converters or tools to create ICO/ICNS formats');
    
    console.log('\n💡 Quick Start:');
    console.log('For immediate use, just create a 256x256 PNG file named "icon.png" in the assets folder.');
    console.log('This will work on all platforms as a fallback.');
  }

  async validateIcons() {
    console.log('\n🔍 Validating existing icons:');
    
    const icons = ['icon.ico', 'icon.png', 'icon.icns', 'icon.svg'];
    
    for (const iconName of icons) {
      const iconPath = path.join(this.assetsPath, iconName);
      if (fs.existsSync(iconPath)) {
        const stats = fs.statSync(iconPath);
        console.log(`✅ ${iconName}: ${(stats.size / 1024).toFixed(2)} KB`);
        
        // Basic validation
        if (stats.size === 0) {
          console.log(`   ⚠️ Warning: ${iconName} is empty`);
        } else if (stats.size > 1024 * 1024) { // 1MB
          console.log(`   ⚠️ Warning: ${iconName} is quite large (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      }
    }
  }

  async run() {
    console.log('🎨 N8NPlus Icon Generator');
    console.log('========================');
    
    if (!(await this.checkSVGExists())) {
      return;
    }

    await this.checkAvailableIcons();
    await this.validateIcons();
    await this.generateInstructions();
    
    console.log('\n✨ Icon setup complete!');
    console.log('Your Electron app will automatically use the best available icon.');
  }
}

// Run the icon generator if this script is executed directly
if (require.main === module) {
  const generator = new IconGenerator();
  generator.run().catch(console.error);
}

module.exports = IconGenerator;
