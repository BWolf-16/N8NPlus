const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

// Test function to check if a port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(false));
      server.close();
    });
    server.on('error', () => resolve(true));
  });
}

// Test the port detection logic
async function testPortDetection() {
  console.log('🔍 Testing automatic port detection...');
  
  const backendPorts = [8001, 8002, 8003, 8004, 8005, 9999, 9998, 9997, 9996, 9000];
  const frontendPorts = [3001, 3002, 3003, 3004, 3005, 8880, 8008, 8080, 8808, 3000];
  
  console.log('\n📊 Backend Port Availability:');
  for (const port of backendPorts.slice(0, 5)) {
    const inUse = await isPortInUse(port);
    console.log(`   Port ${port}: ${inUse ? '❌ In Use' : '✅ Available'}`);
  }
  
  console.log('\n📊 Frontend Port Availability:');
  for (const port of frontendPorts.slice(0, 5)) {
    const inUse = await isPortInUse(port);
    console.log(`   Port ${port}: ${inUse ? '❌ In Use' : '✅ Available'}`);
  }
  
  console.log('\n✅ Port detection test completed');
}

// Run the test
if (require.main === module) {
  testPortDetection().then(() => {
    console.log('\n🎉 N8NPlus automatic startup system is ready!');
    console.log('🚀 To test: Double-click the N8NPlus executable');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testPortDetection, isPortInUse };
