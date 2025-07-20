const waitOn = require('wait-on');
const { spawn } = require('child_process');

async function waitForServers() {
  const preferredPorts = [8880, 8008, 8080, 8808, 3000];
  
  console.log('⏳ Waiting for backend server...');
  await waitOn({ resources: ['http://localhost:9999'] });
  console.log('✅ Backend server is ready');
  
  console.log('⏳ Waiting for frontend server...');
  
  // Check which port the frontend is running on
  let frontendPort = null;
  for (const port of preferredPorts) {
    try {
      await waitOn({ 
        resources: [`http://localhost:${port}`], 
        timeout: 1000 
      });
      frontendPort = port;
      break;
    } catch (err) {
      // Continue to next port
    }
  }
  
  if (frontendPort) {
    console.log(`✅ Frontend server is ready on port ${frontendPort}`);
  } else {
    console.log('⚠️  Frontend server not found on preferred ports, waiting for default...');
    await waitOn({ resources: ['http://localhost:8880'] });
    frontendPort = 8880;
  }
  
  console.log('🚀 Starting Electron...');
  
  // Start Electron
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true
  });
  
  electronProcess.on('close', (code) => {
    process.exit(code);
  });
  
  electronProcess.on('error', (err) => {
    console.error('Failed to start Electron:', err);
    process.exit(1);
  });
}

waitForServers().catch(err => {
  console.error('Error waiting for servers:', err);
  process.exit(1);
});
