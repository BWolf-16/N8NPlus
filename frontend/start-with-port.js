const { spawn } = require('child_process');
const net = require('net');

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Find the best available port using the specified sequence
async function findBestPort() {
  const preferredPorts = [3001, 3002, 3003, 3004, 3005, 8880, 8008, 8080, 8808];
  
  console.log('🔍 Looking for available port...');
  
  // Try preferred ports first
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found preferred port: ${port}`);
      return port;
    } else {
      console.log(`❌ Port ${port} is busy`);
    }
  }
  
  // If none of the preferred ports are available, find any free port starting from 3000
  console.log('🔄 Scanning for any available port...');
  let port = 3000;
  while (port <= 9999) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
    port++;
  }
  
  // Fallback
  console.log('⚠️  Using fallback port 3000');
  return 3000;
}

// Start React with the found port
async function startReact() {
  const port = await findBestPort();
  
  // Set environment variable and start React
  process.env.PORT = port;
  
  console.log(`🚀 Starting React on port ${port}...`);
  
  const reactProcess = spawn('npx', ['react-scripts', 'start'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
    shell: true
  });
  
  reactProcess.on('close', (code) => {
    process.exit(code);
  });
  
  reactProcess.on('error', (err) => {
    console.error('Failed to start React:', err);
    process.exit(1);
  });
}

startReact().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
