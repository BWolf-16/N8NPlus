const path = require('path');
const fs = require('fs');

console.log('🔍 N8NPlus Node.js Path Diagnostics');
console.log('=====================================');

// Helper function to find the correct Node.js executable (same as in main.js)
function getNodeExecutable() {
  if (process.platform === 'win32') {
    const possiblePaths = [
      // Standard installation paths (without quotes first for direct execution)
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
      // User installation paths
      path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'node.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'bin', 'node.exe'),
      // Current process path (if running from Electron with bundled Node)
      process.execPath,
      // Try node in PATH
      'node.exe',
      'node',
      // Local node_modules (shouldn't exist but just in case)
      path.join(__dirname, 'node_modules', '.bin', 'node.exe')
    ];
    
    console.log('\n🔍 Checking possible Node.js paths:');
    
    // Try each path to see if it exists and is executable
    for (const nodePath of possiblePaths) {
      try {
        if (nodePath && fs.existsSync(nodePath)) {
          console.log(`✅ Found: ${nodePath}`);
          // Return the path without quotes for direct execution compatibility
          return nodePath;
        } else {
          console.log(`❌ Not found: ${nodePath || 'undefined'}`);
        }
      } catch (error) {
        console.log(`❌ Error checking: ${nodePath} - ${error.message}`);
      }
    }
    
    console.log('⚠️ No specific Node.js executable found, using default...');
  }
  
  return 'node';
}

// Run diagnostics
console.log('\n📋 System Information:');
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node.js Version: ${process.version}`);
console.log(`Process Path: ${process.execPath}`);

console.log('\n📁 Environment Variables:');
console.log(`ProgramFiles: ${process.env.ProgramFiles || 'Not set'}`);
console.log(`ProgramFiles(x86): ${process.env['ProgramFiles(x86)'] || 'Not set'}`);
console.log(`USERPROFILE: ${process.env.USERPROFILE || 'Not set'}`);
console.log(`LOCALAPPDATA: ${process.env.LOCALAPPDATA || 'Not set'}`);

const nodeExecutable = getNodeExecutable();
console.log(`\n🎯 Selected Node.js executable: ${nodeExecutable}`);

// Test spawn functionality
const { spawn } = require('child_process');

console.log('\n🧪 Testing spawn functionality...');
try {
  console.log(`🔧 Testing Node.js executable: ${nodeExecutable}`);
  
  // Try direct execution first (most reliable)
  let testProcess;
  try {
    console.log('🔧 Trying direct execution (shell: false)...');
    testProcess = spawn(nodeExecutable, ['--version'], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log('✅ Direct execution started successfully');
  } catch (error) {
    console.log(`⚠️ Direct execution failed: ${error.message}`);
    
    // Fallback to shell execution
    if (process.platform === 'win32') {
      const shellPath = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
      console.log(`🔧 Trying with shell: ${shellPath}`);
      
      try {
        testProcess = spawn(`"${nodeExecutable}"`, ['--version'], {
          shell: shellPath,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (shellError) {
        console.log(`⚠️ Shell execution failed: ${shellError.message}`);
        testProcess = spawn(nodeExecutable, ['--version'], {
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }
    } else {
      testProcess = spawn(nodeExecutable, ['--version'], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }
  }

  testProcess.stdout.on('data', (data) => {
    console.log(`✅ Node.js version check successful: ${data.toString().trim()}`);
  });

  testProcess.stderr.on('data', (data) => {
    console.log(`⚠️ Node.js stderr: ${data.toString().trim()}`);
  });

  testProcess.on('error', (error) => {
    console.log(`❌ Spawn test failed: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.log('\n💡 Solutions:');
      console.log('1. Install Node.js from https://nodejs.org/');
      console.log('2. Restart your computer after installation');
      console.log('3. Check that Node.js is in your system PATH');
      console.log('4. Try running this script as administrator');
    }
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Spawn test completed successfully!');
      console.log('\n🎉 Node.js path issue should be resolved!');
    } else {
      console.log(`❌ Spawn test failed with exit code: ${code}`);
    }
  });
} catch (error) {
  console.log(`❌ Failed to test spawn: ${error.message}`);
}
