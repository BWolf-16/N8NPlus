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
  const preferredPorts = [8880, 8008, 8080, 8808];
  
  // Try preferred ports first
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // If none of the preferred ports are available, find any free port starting from 3000
  let port = 3000;
  while (port <= 9999) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  // Fallback to a random high port if everything else fails
  return 3000; // This should never happen, but just in case
}

// Main execution
findBestPort().then(port => {
  console.log(port);
}).catch(err => {
  console.error('Error finding port:', err);
  console.log(3000); // Fallback to default
});
