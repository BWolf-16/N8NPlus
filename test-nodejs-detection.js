// Test Node.js detection paths
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Node.js Detection Paths');
console.log('==================================');

// Test all possible paths
const possibleBundledPaths = [
  // Development: local node directory
  path.join(__dirname, 'node', 'node.exe'),
  // Production: resources/app directory (no asar)
  path.join(process.resourcesPath || '', 'app', 'node', 'node.exe'),
  // Alternative production path from main process
  path.join(__dirname, '..', '..', 'resources', 'app', 'node', 'node.exe'),
  // Another alternative path
  path.join(path.dirname(process.execPath), 'resources', 'app', 'node', 'node.exe')
];

console.log('Process info:');
console.log(`  __dirname: ${__dirname}`);
console.log(`  process.execPath: ${process.execPath}`);
console.log(`  process.resourcesPath: ${process.resourcesPath || 'undefined'}`);
console.log('');

console.log('Testing paths:');
possibleBundledPaths.forEach((nodePath, index) => {
  const exists = fs.existsSync(nodePath);
  console.log(`  ${index + 1}. ${nodePath}`);
  console.log(`     Exists: ${exists ? '✅' : '❌'}`);
  if (exists) {
    try {
      const stats = fs.statSync(nodePath);
      console.log(`     Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (e) {
      console.log(`     Error getting stats: ${e.message}`);
    }
  }
  console.log('');
});
