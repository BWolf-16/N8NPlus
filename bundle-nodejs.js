const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 N8NPlus Portable Node.js Bundler');
console.log('===================================');

const NODE_VERSION = 'v20.11.0';
const NODE_URL = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`;
const NODE_DIR = path.join(__dirname, 'node');
const NODE_ZIP = path.join(__dirname, 'node.zip');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`📥 Downloading Node.js ${NODE_VERSION}...`);
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
                process.stdout.write(`\r📥 Progress: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB)`);
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log('\n✅ Download completed!');
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        }).on('error', reject);
    });
}

async function extractNode() {
    console.log('📦 Extracting Node.js...');
    
    try {
        // Create node directory
        if (fs.existsSync(NODE_DIR)) {
            fs.rmSync(NODE_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(NODE_DIR, { recursive: true });
        
        // Extract using PowerShell (built into Windows)
        const extractCmd = `powershell -Command "Expand-Archive -Path '${NODE_ZIP}' -DestinationPath '${NODE_DIR}' -Force"`;
        execSync(extractCmd, { stdio: 'inherit' });
        
        // Move files from extracted folder to node directory
        const extractedFolder = path.join(NODE_DIR, `node-${NODE_VERSION}-win-x64`);
        if (fs.existsSync(extractedFolder)) {
            const files = fs.readdirSync(extractedFolder);
            for (const file of files) {
                const srcPath = path.join(extractedFolder, file);
                const destPath = path.join(NODE_DIR, file);
                fs.renameSync(srcPath, destPath);
            }
            // Remove empty extracted folder
            fs.rmSync(extractedFolder, { recursive: true, force: true });
        }
        
        console.log('✅ Node.js extracted successfully!');
        
        // Verify extraction
        const nodeExe = path.join(NODE_DIR, 'node.exe');
        if (fs.existsSync(nodeExe)) {
            console.log(`✅ Node.js executable ready: ${nodeExe}`);
            
            // Test Node.js
            try {
                const version = execSync(`"${nodeExe}" --version`, { encoding: 'utf8' }).trim();
                console.log(`✅ Node.js version: ${version}`);
            } catch (error) {
                console.log('⚠️ Could not verify Node.js version, but executable exists');
            }
        } else {
            throw new Error('Node.js executable not found after extraction');
        }
        
    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
        throw error;
    }
}

async function cleanup() {
    console.log('🧹 Cleaning up...');
    if (fs.existsSync(NODE_ZIP)) {
        fs.unlinkSync(NODE_ZIP);
        console.log('✅ Temporary files cleaned');
    }
}

async function bundleNodejs() {
    try {
        // Check if Node.js is already bundled
        const nodeExe = path.join(NODE_DIR, 'node.exe');
        if (fs.existsSync(nodeExe)) {
            console.log('✅ Node.js already bundled, skipping download');
            return;
        }
        
        await downloadFile(NODE_URL, NODE_ZIP);
        await extractNode();
        await cleanup();
        
        console.log('🎉 Node.js bundling completed successfully!');
        console.log(`📁 Node.js location: ${NODE_DIR}`);
        console.log('📝 Node.js will be bundled with your application build');
        
    } catch (error) {
        console.error('❌ Failed to bundle Node.js:', error.message);
        await cleanup();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    bundleNodejs();
}

module.exports = { bundleNodejs };
