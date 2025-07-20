const express = require("express");
const Docker = require("dockerode");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const net = require("net");
const portfinder = require("portfinder");
const os = require("os");

// Use BACKEND_PORT environment variable if set, otherwise use default ports
const preferredPorts = [8001, 8002, 8003, 8004, 8005, 9999, 9998, 9997, 9996, 9000];
let port = parseInt(process.env.BACKEND_PORT) || 8001;

// If the specified port is not in our preferred list, add it
if (!preferredPorts.includes(port)) {
  preferredPorts.unshift(port);
}

const app = express();
let docker = new Docker(); // Default local Docker connection
const DATA_FILE = path.join(__dirname, "containers.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

// Docker connection configuration
let dockerConfig = {
  host: 'localhost',
  port: 2376, // Default Docker API port
  protocol: 'http',
  connected: false,
  lastError: null,
  autoDetect: true
};

// Multi-Docker host management
let dockerConnections = new Map(); // Map of connection ID to Docker instance
let dockerHosts = [
  {
    id: 'local',
    name: 'Local Docker',
    host: 'localhost',
    port: 2376,
    protocol: 'http',
    connected: false,
    lastError: null,
    isDefault: true,
    enabled: true
  }
];

// Load Docker configuration
function loadDockerConfig() {
  try {
    const configPath = path.join(__dirname, 'docker-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      dockerConfig = { ...dockerConfig, ...config };
    }
  } catch (error) {
    console.log('Failed to load Docker config:', error.message);
  }
}

// Save Docker configuration
function saveDockerConfig() {
  try {
    const configPath = path.join(__dirname, 'docker-config.json');
    fs.writeFileSync(configPath, JSON.stringify(dockerConfig, null, 2));
  } catch (error) {
    console.log('Failed to save Docker config:', error.message);
  }
}

// Connect to Docker with specific configuration
async function connectToDocker(config = dockerConfig) {
  try {
    const dockerOptions = {};
    
    if (config.host === 'localhost' || config.host === '127.0.0.1') {
      // Local Docker connection
      dockerOptions.socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    } else {
      // Remote Docker connection
      dockerOptions.host = config.host;
      dockerOptions.port = config.port || 2376;
      dockerOptions.protocol = config.protocol || 'http';
      
      if (config.protocol === 'https') {
        dockerOptions.ca = config.ca;
        dockerOptions.cert = config.cert;
        dockerOptions.key = config.key;
      }
    }
    
    const testDocker = new Docker(dockerOptions);
    
    // Test connection
    await testDocker.ping();
    await testDocker.version();
    
    // If successful, update global docker instance
    docker = testDocker;
    dockerConfig.connected = true;
    dockerConfig.lastError = null;
    dockerConfig.host = config.host;
    dockerConfig.port = config.port;
    dockerConfig.protocol = config.protocol;
    
    saveDockerConfig();
    return { success: true, message: `Connected to Docker at ${config.host}` };
    
  } catch (error) {
    dockerConfig.connected = false;
    dockerConfig.lastError = error.message;
    return { success: false, message: error.message };
  }
}

// Network auto-detection for Docker instances
async function scanNetworkForDocker() {
  const results = [];
  const networkRange = getLocalNetworkRange();
  
  console.log(`Scanning network ${networkRange} for Docker instances...`);
  
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = networkRange.replace('x', i.toString());
    promises.push(testDockerConnection(ip));
  }
  
  const testResults = await Promise.allSettled(promises);
  
  testResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      const ip = networkRange.replace('x', (index + 1).toString());
      results.push({
        host: ip,
        port: 2376,
        version: result.value.version,
        containers: result.value.containers
      });
    }
  });
  
  return results;
}

// Get local network range for scanning
function getLocalNetworkRange() {
  const interfaces = require('os').networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        const subnet = ip.split('.').slice(0, 3).join('.') + '.x';
        return subnet;
      }
    }
  }
  
  return '192.168.1.x'; // Fallback
}

// Test Docker connection to a specific host
async function testDockerConnection(host, port = 2376, timeout = 3000) {
  return new Promise(async (resolve) => {
    const timer = setTimeout(() => {
      resolve({ success: false, error: 'timeout' });
    }, timeout);
    
    try {
      const testDocker = new Docker({
        host: host,
        port: port,
        protocol: 'http'
      });
      
      await testDocker.ping();
      const version = await testDocker.version();
      const containers = await testDocker.listContainers();
      
      // Check if this Docker instance has n8n containers
      const n8nContainers = containers.filter(container => 
        container.Image.includes('n8nio/n8n') || 
        container.Names.some(name => name.includes('n8n'))
      );
      
      clearTimeout(timer);
      resolve({ 
        success: true, 
        version: version.Version,
        containers: containers.length,
        n8nContainers: n8nContainers.length
      });
      
    } catch (error) {
      clearTimeout(timer);
      resolve({ success: false, error: error.message });
    }
  });
}

// Initialize Docker connection on startup
loadDockerConfig();
connectToDocker();

// Multi-Docker host management functions
function loadDockerHosts() {
  try {
    const hostsPath = path.join(__dirname, 'docker-hosts.json');
    if (fs.existsSync(hostsPath)) {
      const hosts = JSON.parse(fs.readFileSync(hostsPath, 'utf8'));
      dockerHosts = hosts;
    }
  } catch (error) {
    console.log('Failed to load Docker hosts:', error.message);
  }
}

function saveDockerHosts() {
  try {
    const hostsPath = path.join(__dirname, 'docker-hosts.json');
    fs.writeFileSync(hostsPath, JSON.stringify(dockerHosts, null, 2));
  } catch (error) {
    console.log('Failed to save Docker hosts:', error.message);
  }
}

async function connectToDockerHost(hostConfig) {
  try {
    const dockerOptions = {};
    
    if (hostConfig.host === 'localhost' || hostConfig.host === '127.0.0.1') {
      // Local Docker connection
      dockerOptions.socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    } else {
      // Remote Docker connection
      dockerOptions.host = hostConfig.host;
      dockerOptions.port = hostConfig.port || 2376;
      dockerOptions.protocol = hostConfig.protocol || 'http';
      
      if (hostConfig.protocol === 'https') {
        dockerOptions.ca = hostConfig.ca;
        dockerOptions.cert = hostConfig.cert;
        dockerOptions.key = hostConfig.key;
      }
    }
    
    const dockerInstance = new Docker(dockerOptions);
    
    // Test connection
    await dockerInstance.ping();
    await dockerInstance.version();
    
    // Store the connection
    dockerConnections.set(hostConfig.id, dockerInstance);
    
    // Update host status
    const hostIndex = dockerHosts.findIndex(h => h.id === hostConfig.id);
    if (hostIndex !== -1) {
      dockerHosts[hostIndex].connected = true;
      dockerHosts[hostIndex].lastError = null;
    }
    
    console.log(`✅ Connected to Docker host: ${hostConfig.name} (${hostConfig.host})`);
    return { success: true, message: `Connected to ${hostConfig.name}` };
    
  } catch (error) {
    console.error(`❌ Failed to connect to Docker host ${hostConfig.name}:`, error.message);
    
    // Update host status
    const hostIndex = dockerHosts.findIndex(h => h.id === hostConfig.id);
    if (hostIndex !== -1) {
      dockerHosts[hostIndex].connected = false;
      dockerHosts[hostIndex].lastError = error.message;
    }
    
    return { success: false, message: error.message };
  }
}

async function initializeAllDockerHosts() {
  console.log('🐳 Initializing Docker host connections...');
  
  for (const host of dockerHosts) {
    if (host.enabled) {
      await connectToDockerHost(host);
    }
  }
  
  saveDockerHosts();
}

async function getContainersFromAllHosts() {
  const allContainers = [];
  
  for (const [hostId, dockerInstance] of dockerConnections) {
    try {
      const hostConfig = dockerHosts.find(h => h.id === hostId);
      if (!hostConfig || !hostConfig.enabled) continue;
      
      const containers = await dockerInstance.listContainers({ all: true });
      
      // Add host information to each container
      const containersWithHost = containers.map(container => ({
        ...container,
        dockerHost: {
          id: hostId,
          name: hostConfig.name,
          host: hostConfig.host,
          port: hostConfig.port
        }
      }));
      
      allContainers.push(...containersWithHost);
    } catch (error) {
      console.error(`Error getting containers from host ${hostId}:`, error.message);
    }
  }
  
  return allContainers;
}

async function getContainerFromAnyHost(containerName) {
  for (const [hostId, dockerInstance] of dockerConnections) {
    try {
      const container = dockerInstance.getContainer(containerName);
      const info = await container.inspect();
      return {
        container,
        dockerInstance,
        hostId,
        info
      };
    } catch (error) {
      // Container not found on this host, continue to next
      continue;
    }
  }
  
  throw new Error(`Container ${containerName} not found on any connected Docker host`);
}

// Initialize multi-host connections
loadDockerHosts();
initializeAllDockerHosts();

// Enable CORS for all origins to allow remote access
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Load or initialize container config
let containerDB = {};
if (fs.existsSync(DATA_FILE)) {
  containerDB = fs.readJsonSync(DATA_FILE);
} else {
  fs.writeJsonSync(DATA_FILE, {});
}

// Load or initialize app config
let appConfig = { baseAddress: "localhost" };
if (fs.existsSync(CONFIG_FILE)) {
  appConfig = { ...appConfig, ...fs.readJsonSync(CONFIG_FILE) };
} else {
  fs.writeJsonSync(CONFIG_FILE, appConfig);
}

// Utility to save config
const saveDB = () => fs.writeJsonSync(DATA_FILE, containerDB);
const saveConfig = () => fs.writeJsonSync(CONFIG_FILE, appConfig);

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

// Find next free port starting from 5678
async function getNextPort() {
  const usedPorts = Object.values(containerDB).map(c => c.port);
  
  // Set the starting port for portfinder
  portfinder.setBasePort(5678);
  
  let port = 5678;
  while (true) {
    try {
      const freePort = await portfinder.getPortPromise({ port });
      if (!usedPorts.includes(freePort)) {
        return freePort;
      }
      port = freePort + 1;
    } catch (err) {
      port++;
    }
  }
}

// Check for port conflicts on startup
async function checkPortConflicts() {
  const conflicts = [];
  for (const [name, container] of Object.entries(containerDB)) {
    if (container.status === "running" && !await isPortAvailable(container.port)) {
      // Check if it's actually our container running
      try {
        const dockerContainer = docker.getContainer(name);
        const info = await dockerContainer.inspect();
        if (!info.State.Running) {
          conflicts.push({ name, port: container.port, reason: "port_occupied" });
        }
      } catch (err) {
        conflicts.push({ name, port: container.port, reason: "container_missing" });
      }
    }
  }
  return conflicts;
}

// List containers with real-time Docker status check from all hosts
app.get("/api/containers", async (req, res) => {
  try {
    const containers = Object.values(containerDB);
    
    // Check each managed container's actual Docker status across all hosts
    for (const container of containers) {
      try {
        const result = await getContainerFromAnyHost(container.name);
        container.status = result.info.State.Running ? "running" : "stopped";
        container.dockerExists = true;
        container.errorMessage = null;
        container.dockerHost = dockerHosts.find(h => h.id === result.hostId);
      } catch (err) {
        // Container doesn't exist on any connected Docker host
        container.status = "not-found";
        container.dockerExists = false;
        container.errorMessage = "Container not found on any Docker host";
        container.dockerHost = null;
      }
    }

    // Get all containers from all connected Docker hosts (for discovery)
    const allDockerContainers = await getContainersFromAllHosts();
    
    // Add discovered n8n containers that aren't in our database
    const discoveredContainers = allDockerContainers
      .filter(dockerContainer => {
        // Check if it's an n8n container
        const isN8NContainer = dockerContainer.Image.includes('n8nio/n8n') ||
                               dockerContainer.Names.some(name => name.includes('n8n'));
        
        // Check if it's not already in our managed containers
        const isManaged = containers.some(managed => 
          dockerContainer.Names.some(name => name.replace('/', '') === managed.name)
        );
        
        return isN8NContainer && !isManaged;
      })
      .map(dockerContainer => {
        const name = dockerContainer.Names[0].replace('/', '');
        return {
          id: `discovered_${name}_${dockerContainer.dockerHost.id}`,
          name: name,
          address: `${dockerContainer.dockerHost.host}`,
          port: 'Unknown',
          status: dockerContainer.State === 'running' ? 'running' : 'stopped',
          dockerExists: true,
          errorMessage: null,
          dockerHost: dockerContainer.dockerHost,
          isDiscovered: true,
          dockerContainerInfo: dockerContainer
        };
      });

    // Combine managed and discovered containers
    const allContainers = [...containers, ...discoveredContainers];
    
    // Save updated statuses for managed containers
    saveDB();
    res.json(allContainers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get app config
app.get("/api/config", (req, res) => {
  res.json(appConfig);
});

// Update base address
app.post("/api/config/baseAddress", (req, res) => {
  const { baseAddress } = req.body;
  if (!baseAddress) return res.status(400).send("Base address is required");
  
  appConfig.baseAddress = baseAddress;
  saveConfig();
  res.json({ success: true, baseAddress });
});

// Network discovery endpoint - returns server info for remote clients
app.get("/api/network/info", (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const alias of networkInterface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        addresses.push({
          interface: interfaceName,
          address: alias.address,
          netmask: alias.netmask
        });
      }
    }
  }
  
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    version: require('./package.json').version || '1.0.0',
    addresses,
    isN8NPlus: true,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for network scanning
app.get("/api/health", (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'N8NPlus',
    version: require('./package.json').version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Docker status check endpoint with enhanced connection info
app.get("/api/docker/status", async (req, res) => {
  try {
    // Check if Docker daemon is responding
    await docker.ping();
    
    // Check Docker version
    const version = await docker.version();
    res.json({
      status: "running",
      version: version.Version,
      apiVersion: version.ApiVersion,
      available: true,
      connection: {
        host: dockerConfig.host,
        port: dockerConfig.port,
        protocol: dockerConfig.protocol,
        connected: dockerConfig.connected,
        lastError: dockerConfig.lastError
      }
    });
  } catch (err) {
    dockerConfig.connected = false;
    dockerConfig.lastError = err.message;
    
    // Check if Docker is installed but not running
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    
    // Try to check if Docker is installed
    const dockerCmd = isWindows ? 'docker' : 'docker';
    const dockerProcess = spawn(dockerCmd, ['--version'], { 
      stdio: 'pipe',
      shell: true 
    });
    
    let dockerInstalled = false;
    let dockerVersion = null;
    
    dockerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Docker version')) {
        dockerInstalled = true;
        dockerVersion = output.trim();
      }
    });
    
    dockerProcess.on('close', (code) => {
      if (dockerInstalled) {
        res.json({
          status: "not-running",
          version: dockerVersion,
          available: false,
          installed: true,
          message: "Docker is installed but not running",
          connection: {
            host: dockerConfig.host,
            port: dockerConfig.port,
            protocol: dockerConfig.protocol,
            connected: false,
            lastError: err.message
          }
        });
      } else {
        res.json({
          status: "not-installed",
          available: false,
          installed: false,
          message: "Docker is not installed",
          connection: {
            host: dockerConfig.host,
            port: dockerConfig.port,
            protocol: dockerConfig.protocol,
            connected: false,
            lastError: err.message
          }
        });
      }
    });
    
    dockerProcess.on('error', () => {
      res.json({
        status: "not-installed",
        available: false,
        installed: false,
        message: "Docker is not installed",
        connection: {
          host: dockerConfig.host,
          port: dockerConfig.port,
          protocol: dockerConfig.protocol,
          connected: false,
          lastError: err.message
        }
      });
    });
  }
});

// Start Docker service
app.post("/api/docker/start", async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Try different methods to start Docker Desktop on Windows
      const methods = [
        ['powershell', ['-Command', 'Start-Process "Docker Desktop" -WindowStyle Hidden']],
        ['cmd', ['/c', 'start', '', '"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"']],
        ['powershell', ['-Command', '& "${env:ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe"']]
      ];
      
      let started = false;
      for (const [cmd, args] of methods) {
        try {
          const process = spawn(cmd, args, { detached: true, stdio: 'ignore' });
          process.unref();
          started = true;
          break;
        } catch (err) {
          continue;
        }
      }
      
      if (started) {
        res.json({ 
          success: true, 
          message: "Docker Desktop is starting... Please wait a moment.",
          action: "started"
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to start Docker Desktop. Please start it manually.",
          action: "failed"
        });
      }
    } else {
      // For Linux/Mac
      const process = spawn('systemctl', ['start', 'docker'], { detached: true, stdio: 'ignore' });
      process.unref();
      res.json({ 
        success: true, 
        message: "Docker service is starting...",
        action: "started"
      });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: `Failed to start Docker: ${err.message}`,
      action: "failed"
    });
  }
});

// Install Docker
app.post("/api/docker/install", async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // For Windows, we'll provide download instructions rather than auto-install
      // since it requires admin privileges and user interaction
      res.json({
        success: false,
        message: "Please download Docker Desktop from https://docker.com/products/docker-desktop and install it manually.",
        action: "manual-install-required",
        downloadUrl: "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
      });
    } else {
      // For Linux, attempt to install Docker
      const installCmd = process.platform === 'darwin' ? 
        ['brew', ['install', '--cask', 'docker']] :
        ['curl', ['-fsSL', 'https://get.docker.com', '-o', 'get-docker.sh', '&&', 'sh', 'get-docker.sh']];
      
      const [cmd, args] = installCmd;
      const process = spawn(cmd, args, { stdio: 'pipe' });
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          res.json({
            success: true,
            message: "Docker installation completed successfully!",
            action: "installed",
            output: output
          });
        } else {
          res.json({
            success: false,
            message: "Docker installation failed. Please install manually.",
            action: "install-failed",
            output: output
          });
        }
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Installation failed: ${err.message}`,
      action: "install-failed"
    });
  }
});

// Docker connection configuration endpoints
app.get("/api/docker/config", (req, res) => {
  res.json(dockerConfig);
});

app.post("/api/docker/connect", async (req, res) => {
  const { host, port, protocol, ca, cert, key } = req.body;
  
  const config = {
    host: host || 'localhost',
    port: parseInt(port) || 2376,
    protocol: protocol || 'http',
    ca, cert, key
  };
  
  const result = await connectToDocker(config);
  res.json(result);
});

// Network scanning endpoint
app.get("/api/docker/scan", async (req, res) => {
  try {
    console.log('Starting network scan for Docker instances...');
    const results = await scanNetworkForDocker();
    res.json({ success: true, results });
  } catch (error) {
    console.error('Network scan error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Test specific Docker connection
app.post("/api/docker/test", async (req, res) => {
  const { host, port } = req.body;
  
  if (!host) {
    return res.json({ success: false, error: 'Host is required' });
  }
  
  const result = await testDockerConnection(host, port || 2376);
  res.json(result);
});

// Docker hosts management endpoints
app.get("/api/docker/hosts", (req, res) => {
  // Return hosts with current connection status
  const hostsWithStatus = dockerHosts.map(host => ({
    ...host,
    connected: dockerConnections.has(host.id)
  }));
  res.json(hostsWithStatus);
});

app.post("/api/docker/hosts", async (req, res) => {
  const { name, host, port, protocol, enabled } = req.body;
  
  if (!name || !host) {
    return res.json({ success: false, error: 'Name and host are required' });
  }
  
  const newHost = {
    id: `host_${Date.now()}`,
    name,
    host,
    port: parseInt(port) || 2376,
    protocol: protocol || 'http',
    connected: false,
    lastError: null,
    isDefault: false,
    enabled: enabled !== false
  };
  
  dockerHosts.push(newHost);
  saveDockerHosts();
  
  // Try to connect to the new host if enabled
  if (newHost.enabled) {
    const result = await connectToDockerHost(newHost);
    res.json({ success: true, host: newHost, connection: result });
  } else {
    res.json({ success: true, host: newHost });
  }
});

app.put("/api/docker/hosts/:id", async (req, res) => {
  const { id } = req.params;
  const { name, host, port, protocol, enabled } = req.body;
  
  const hostIndex = dockerHosts.findIndex(h => h.id === id);
  if (hostIndex === -1) {
    return res.json({ success: false, error: 'Host not found' });
  }
  
  // Update host configuration
  const hostConfig = dockerHosts[hostIndex];
  if (name) hostConfig.name = name;
  if (host) hostConfig.host = host;
  if (port) hostConfig.port = parseInt(port);
  if (protocol) hostConfig.protocol = protocol;
  if (enabled !== undefined) hostConfig.enabled = enabled;
  
  saveDockerHosts();
  
  // Reconnect if configuration changed and host is enabled
  if (hostConfig.enabled) {
    // Disconnect existing connection
    if (dockerConnections.has(id)) {
      dockerConnections.delete(id);
    }
    
    const result = await connectToDockerHost(hostConfig);
    res.json({ success: true, host: hostConfig, connection: result });
  } else {
    // Disable connection
    if (dockerConnections.has(id)) {
      dockerConnections.delete(id);
    }
    hostConfig.connected = false;
    res.json({ success: true, host: hostConfig });
  }
});

app.delete("/api/docker/hosts/:id", (req, res) => {
  const { id } = req.params;
  
  // Don't allow deleting the default local host
  const hostIndex = dockerHosts.findIndex(h => h.id === id);
  if (hostIndex === -1) {
    return res.json({ success: false, error: 'Host not found' });
  }
  
  if (dockerHosts[hostIndex].isDefault) {
    return res.json({ success: false, error: 'Cannot delete default local Docker host' });
  }
  
  // Remove connection
  if (dockerConnections.has(id)) {
    dockerConnections.delete(id);
  }
  
  // Remove from hosts list
  dockerHosts.splice(hostIndex, 1);
  saveDockerHosts();
  
  res.json({ success: true, message: 'Host removed successfully' });
});

app.post("/api/docker/hosts/:id/connect", async (req, res) => {
  const { id } = req.params;
  
  const hostConfig = dockerHosts.find(h => h.id === id);
  if (!hostConfig) {
    return res.json({ success: false, error: 'Host not found' });
  }
  
  const result = await connectToDockerHost(hostConfig);
  res.json(result);
});

app.post("/api/docker/hosts/:id/disconnect", (req, res) => {
  const { id } = req.params;
  
  if (dockerConnections.has(id)) {
    dockerConnections.delete(id);
    
    const hostIndex = dockerHosts.findIndex(h => h.id === id);
    if (hostIndex !== -1) {
      dockerHosts[hostIndex].connected = false;
    }
    
    res.json({ success: true, message: 'Host disconnected' });
  } else {
    res.json({ success: false, error: 'Host not connected' });
  }
});

// Check for port conflicts
app.get("/api/conflicts", async (req, res) => {
  try {
    const conflicts = await checkPortConflicts();
    res.json(conflicts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve port conflict by reassigning
app.post("/api/conflicts/reassign/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!containerDB[name]) return res.status(404).send("Container not found");
    
    const newPort = await getNextPort();
    containerDB[name].port = newPort;
    saveDB();
    
    res.json({ success: true, newPort });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ping a container to check if it's accessible
app.get("/api/ping/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const container = containerDB[name];
    if (!container) return res.status(404).send("Container not found");
    
    const available = await isPortAvailable(container.port);
    res.json({ 
      accessible: !available, // If port is not available, it means something is running on it
      port: container.port,
      baseAddress: container.baseAddress || appConfig.baseAddress
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create container
app.post("/api/containers", async (req, res) => {
  const { name } = req.body;
  if (!name || containerDB[name]) return res.status(400).send("Invalid or duplicate name");

  const port = await getNextPort();
  const volumePath = path.join(__dirname, "volumes", name);
  await fs.ensureDir(volumePath);

  try {
    const container = await docker.createContainer({
      name,
      Image: "n8nio/n8n",
      HostConfig: {
        PortBindings: {
          "5678/tcp": [{ HostPort: port.toString() }]
        },
        Binds: [`${volumePath}:/home/node/.n8n`]
      }
    });

    containerDB[name] = { name, port, status: "created", baseAddress: appConfig.baseAddress };
    saveDB();
    res.status(201).json(containerDB[name]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start container (or recreate if missing) - Multi-host support
app.post("/api/start/:name", async (req, res) => {
  const name = req.params.name;
  const { forceRecreate, hostId } = req.body;
  
  if (!containerDB[name]) {
    return res.status(404).json({ error: "Container not found in database" });
  }

  try {
    // Try to find container on any host first
    const containerResult = await getContainerFromAnyHost(name);
    const { container, dockerInstance, hostId: foundHostId } = containerResult;
    
    try {
      // Try to start existing container
      await container.start();
      containerDB[name].status = "running";
      containerDB[name].dockerExists = true;
      containerDB[name].errorMessage = null;
      containerDB[name].dockerHost = dockerHosts.find(h => h.id === foundHostId);
      saveDB();
      res.json({ message: "Started", recreated: false, hostId: foundHostId });
    } catch (startErr) {
      if (startErr.statusCode === 304) {
        // Container already running
        containerDB[name].status = "running";
        containerDB[name].dockerHost = dockerHosts.find(h => h.id === foundHostId);
        saveDB();
        res.json({ message: "Already running", recreated: false, hostId: foundHostId });
      } else {
        throw startErr;
      }
    }
  } catch (err) {
    if (err.message.includes("not found on any connected Docker host") || forceRecreate) {
      // Container doesn't exist on any host, create on specified host or default
      if (forceRecreate) {
        try {
          const dbContainer = containerDB[name];
          const volumePath = path.join(__dirname, "volumes", name);
          await fs.ensureDir(volumePath);

          // Use specified host or default to local
          const targetHostId = hostId || 'local';
          const dockerInstance = dockerConnections.get(targetHostId);
          
          if (!dockerInstance) {
            return res.status(400).json({ error: `Docker host ${targetHostId} not connected` });
          }

          const newContainer = await dockerInstance.createContainer({
            name,
            Image: "n8nio/n8n",
            HostConfig: {
              PortBindings: {
                "5678/tcp": [{ HostPort: dbContainer.port.toString() }]
              },
              Binds: [`${volumePath}:/home/node/.n8n`]
            }
          });

          await newContainer.start();
          containerDB[name].status = "running";
          containerDB[name].dockerExists = true;
          containerDB[name].errorMessage = null;
          containerDB[name].dockerHost = dockerHosts.find(h => h.id === targetHostId);
          saveDB();
          res.json({ message: "Recreated and started", recreated: true, hostId: targetHostId });
        } catch (recreateErr) {
          res.status(500).json({ error: `Failed to recreate container: ${recreateErr.message}` });
        }
      } else {
        // Return special response asking for confirmation
        res.status(409).json({ 
          error: "docker_not_found",
          message: "Docker container not found. Do you want to create one?",
          needsRecreation: true
        });
      }
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Stop container - Multi-host support
app.post("/api/stop/:name", async (req, res) => {
  const name = req.params.name;
  
  try {
    const containerResult = await getContainerFromAnyHost(name);
    const { container } = containerResult;
    
    await container.stop();
    
    if (containerDB[name]) {
      containerDB[name].status = "stopped";
      saveDB();
    }
    
    res.send("Stopped");
  } catch (err) {
    if (err.message.includes("not found on any connected Docker host")) {
      res.status(404).json({ error: "Container not found on any Docker host" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Delete container (from Docker and database) - Multi-host support
app.post("/api/delete/:name", async (req, res) => {
  const name = req.params.name;
  
  if (!containerDB[name]) {
    return res.status(404).json({ error: "Container not found in database" });
  }

  try {
    // Try to find and remove from any Docker host
    const containerResult = await getContainerFromAnyHost(name);
    const { container } = containerResult;
    await container.remove({ force: true });
  } catch (err) {
    if (!err.message.includes("not found on any connected Docker host")) {
      // If it's not a "container not found" error, it's a real error
      return res.status(500).json({ error: err.message });
    }
    // If container doesn't exist on any Docker host, that's fine - we'll just remove from database
  }
  
  // Always remove from database
  delete containerDB[name];
  saveDB();
  res.json({ message: "Deleted", removedFromDocker: true });
});

// Edit container
app.put("/api/edit/:name", async (req, res) => {
  try {
    const oldName = req.params.name;
    const { newName, newPort, newBaseAddress } = req.body;
    
    if (!containerDB[oldName]) {
      return res.status(404).json({ error: "Container not found" });
    }
    
    const currentContainer = containerDB[oldName];
    const isRunning = currentContainer.status === "running";
    
    // If container is running, we need to stop it first
    if (isRunning) {
      try {
        const dockerContainer = docker.getContainer(oldName);
        await dockerContainer.stop();
      } catch (err) {
        console.log("Container might already be stopped:", err.message);
      }
    }
    
    // Check if new port is available (if port is being changed)
    if (newPort && newPort !== currentContainer.port) {
      const portAvailable = await isPortAvailable(newPort);
      if (!portAvailable) {
        // Check if it's being used by another container in our DB
        const existingContainer = Object.values(containerDB).find(c => c.port === newPort && c.name !== oldName);
        if (existingContainer) {
          return res.status(400).json({ error: `Port ${newPort} is already in use by container '${existingContainer.name}'` });
        }
        return res.status(400).json({ error: `Port ${newPort} is not available` });
      }
    }
    
    // Check if new name is available (if name is being changed)
    if (newName && newName !== oldName) {
      if (containerDB[newName]) {
        return res.status(400).json({ error: `Container name '${newName}' already exists` });
      }
    }
    
    // Remove old Docker container
    try {
      const dockerContainer = docker.getContainer(oldName);
      await dockerContainer.remove({ force: true });
    } catch (err) {
      console.log("Error removing old container:", err.message);
    }
    
    // Create new container with updated settings
    const finalName = newName || oldName;
    const finalPort = newPort || currentContainer.port;
    const finalBaseAddress = newBaseAddress || currentContainer.baseAddress;
    
    // Handle volume path (rename if name changed)
    const oldVolumePath = path.join(__dirname, "volumes", oldName);
    const newVolumePath = path.join(__dirname, "volumes", finalName);
    
    if (newName && newName !== oldName && fs.existsSync(oldVolumePath)) {
      await fs.move(oldVolumePath, newVolumePath);
    } else if (!fs.existsSync(newVolumePath)) {
      await fs.ensureDir(newVolumePath);
    }
    
    // Create new Docker container
    const newDockerContainer = await docker.createContainer({
      name: finalName,
      Image: "n8nio/n8n",
      HostConfig: {
        PortBindings: {
          "5678/tcp": [{ HostPort: finalPort.toString() }]
        },
        Binds: [`${newVolumePath}:/home/node/.n8n`]
      }
    });
    
    // Update database
    if (newName && newName !== oldName) {
      delete containerDB[oldName];
    }
    
    containerDB[finalName] = { 
      name: finalName, 
      port: finalPort, 
      status: "created", 
      baseAddress: finalBaseAddress 
    };
    
    // Start container if it was running before
    if (isRunning) {
      try {
        await newDockerContainer.start();
        containerDB[finalName].status = "running";
      } catch (err) {
        console.log("Error starting updated container:", err.message);
        containerDB[finalName].status = "created";
      }
    }
    
    saveDB();
    res.json({ 
      success: true, 
      container: containerDB[finalName],
      message: `Container updated successfully${newName && newName !== oldName ? ` (renamed from '${oldName}' to '${finalName}')` : ''}`
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop all containers across all Docker hosts
app.post("/api/containers/stop-all", async (req, res) => {
  try {
    console.log('🛑 Stopping all containers across all Docker hosts...');
    const results = [];
    let stoppedCount = 0;
    let errorCount = 0;
    
    // Stop all containers in our database
    for (const [name, containerInfo] of Object.entries(containerDB)) {
      try {
        if (containerInfo.status === 'running') {
          console.log(`🛑 Stopping container: ${name}`);
          
          // Try to find and stop the container on any host
          const containerResult = await getContainerFromAnyHost(name);
          const { container, hostId } = containerResult;
          
          await container.stop();
          
          containerInfo.status = 'stopped';
          stoppedCount++;
          
          results.push({
            name,
            status: 'stopped',
            hostId,
            success: true
          });
          
          console.log(`✅ Stopped container: ${name} on host: ${hostId}`);
        } else {
          results.push({
            name,
            status: 'already_stopped',
            success: true,
            message: 'Container was already stopped'
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          name,
          status: 'error',
          success: false,
          error: error.message
        });
        console.log(`❌ Failed to stop container ${name}: ${error.message}`);
      }
    }
    
    // Save updated status
    saveDB();
    
    console.log(`✅ Stop-all completed: ${stoppedCount} stopped, ${errorCount} errors`);
    
    res.json({
      success: true,
      message: `Stop-all completed: ${stoppedCount} containers stopped, ${errorCount} errors`,
      stoppedCount,
      errorCount,
      totalContainers: Object.keys(containerDB).length,
      results
    });
    
  } catch (error) {
    console.error('❌ Error in stop-all operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop containers',
      details: error.message
    });
  }
});

// Function to start server with port fallback
function startServer() {
  const server = app.listen(port, '0.0.0.0', async () => {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const interfaceName in networkInterfaces) {
      const networkInterface = networkInterfaces[interfaceName];
      for (const alias of networkInterface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          addresses.push(alias.address);
        }
      }
    }
    
    console.log(`🔧 N8NPlus backend listening on:`);
    console.log(`   Local:    http://localhost:${port}`);
    addresses.forEach(addr => {
      console.log(`   Network:  http://${addr}:${port}`);
    });
    console.log(`🌐 Backend accessible from remote devices on network`);
    
    // Check for port conflicts on startup
    try {
      const conflicts = await checkPortConflicts();
      if (conflicts.length > 0) {
        console.log("⚠️  Port conflicts detected:", conflicts);
      }
    } catch (err) {
      console.error("Failed to check port conflicts:", err.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`❌ Port ${port} is already in use`);
      // Try next preferred port
      const currentIndex = preferredPorts.indexOf(port);
      if (currentIndex < preferredPorts.length - 1) {
        port = preferredPorts[currentIndex + 1];
        console.log(`🔄 Trying port ${port}...`);
        // Restart server on new port after a short delay
        setTimeout(() => {
          startServer();
        }, 1000);
      } else {
        console.log(`❌ All preferred ports are in use. Please configure different ports.`);
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });

  return server;
}

// Start the server
startServer();
