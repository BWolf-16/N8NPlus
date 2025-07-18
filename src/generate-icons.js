const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
    const assetsDir = path.join(__dirname, '..', 'assets');
    const svgPath = path.join(assetsDir, 'icon.svg');
    
    if (!fs.existsSync(svgPath)) {
        console.error('❌ SVG icon not found at:', svgPath);
        return;
    }
    
    console.log('🎨 Converting SVG to platform-specific icon formats...');
    
    try {
        // Convert SVG to PNG (256x256)
        const pngPath = path.join(assetsDir, 'icon.png');
        await sharp(svgPath)
            .resize(256, 256)
            .png()
            .toFile(pngPath);
        console.log('✅ Created icon.png (256x256)');
        
        // Create ICO for Windows (multiple sizes)
        const icoPath = path.join(assetsDir, 'icon.ico');
        const icoSizes = [256, 128, 64, 48, 32, 16];
        
        // Generate multiple size PNGs for ICO
        const iconImages = [];
        for (const size of icoSizes) {
            const buffer = await sharp(svgPath)
                .resize(size, size)
                .png()
                .toBuffer();
            iconImages.push(buffer);
        }
        
        // For now, just use the 256px PNG as ICO (electron-builder will handle multi-size)
        await sharp(svgPath)
            .resize(256, 256)
            .png()
            .toFile(icoPath.replace('.ico', '_temp.png'));
        
        // Rename to .ico (basic approach - electron-builder will optimize)
        fs.renameSync(icoPath.replace('.ico', '_temp.png'), icoPath);
        console.log('✅ Created icon.ico (Windows)');
        
        // Create additional sizes for better quality
        const sizes = [512, 1024];
        for (const size of sizes) {
            const sizePath = path.join(assetsDir, `icon-${size}.png`);
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(sizePath);
            console.log(`✅ Created icon-${size}.png`);
        }
        
        console.log('🎉 Icon conversion complete!');
        console.log('📁 Generated files in assets/:');
        console.log('  - icon.png (256x256) - Universal');
        console.log('  - icon.ico (256x256) - Windows');
        console.log('  - icon-512.png (512x512) - High quality');
        console.log('  - icon-1024.png (1024x1024) - Extra high quality');
        console.log('');
        console.log('💡 Note: For macOS .icns format, electron-builder will auto-generate from PNG');
        console.log('🚀 Ready to build installers with: npm run build-all');
        
    } catch (error) {
        console.error('❌ Error converting icons:', error);
    }
}

generateIcons();
