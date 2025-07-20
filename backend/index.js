const express = require("express");
const Docker = require("dockerode");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const net = require("net");
const portfinder = require("portfinder");
const os = require("os");

// Use BACKEND_PORT environment variable if set, otherwise use default ports
const preferredPorts = [9999, 9998, 9997, 9996, 9000];
let port = parseInt(process.env.BACKEND_PORT) || 9999;

// If the specified port is not in our preferred list, add it
if (!preferredPorts.includes(port)) {
  preferredPorts.unshift(port);
}

const app = express();
const docker = new Docker();
const DATA_FILE = path.join(__dirname, "containers.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

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

// List containers with real-time Docker status check
app.get("/api/containers", async (req, res) => {
  try {
    const containers = Object.values(containerDB);
    
    // Check each container's actual Docker status
    for (const container of containers) {
      try {
        const dockerContainer = docker.getContainer(container.name);
        const info = await dockerContainer.inspect();
        container.status = info.State.Running ? "running" : "stopped";
        container.dockerExists = true;
        container.errorMessage = null;
      } catch (err) {
        // Container doesn't exist in Docker
        container.status = "not-found";
        container.dockerExists = false;
        container.errorMessage = "Docker container not found";
      }
    }
    
    // Save updated statuses
    saveDB();
    res.json(containers);
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

// Docker status check endpoint
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
      available: true
    });
  } catch (err) {
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
          message: "Docker is installed but not running"
        });
      } else {
        res.json({
          status: "not-installed",
          available: false,
          installed: false,
          message: "Docker is not installed"
        });
      }
    });
    
    dockerProcess.on('error', () => {
      res.json({
        status: "not-installed",
        available: false,
        installed: false,
        message: "Docker is not installed"
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

// Start container (or recreate if missing)
app.post("/api/start/:name", async (req, res) => {
  const name = req.params.name;
  const { forceRecreate } = req.body;
  
  if (!containerDB[name]) {
    return res.status(404).json({ error: "Container not found in database" });
  }

  try {
    const container = docker.getContainer(name);
    
    try {
      // Try to start existing container
      await container.start();
      containerDB[name].status = "running";
      containerDB[name].dockerExists = true;
      containerDB[name].errorMessage = null;
      saveDB();
      res.json({ message: "Started", recreated: false });
    } catch (startErr) {
      if (startErr.statusCode === 304) {
        // Container already running
        containerDB[name].status = "running";
        saveDB();
        res.json({ message: "Already running", recreated: false });
      } else {
        throw startErr;
      }
    }
  } catch (err) {
    if (err.statusCode === 404 || err.message.includes("No such container")) {
      // Container doesn't exist in Docker
      if (forceRecreate) {
        // Recreate the container
        try {
          const dbContainer = containerDB[name];
          const volumePath = path.join(__dirname, "volumes", name);
          await fs.ensureDir(volumePath);

          const newContainer = await docker.createContainer({
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
          saveDB();
          res.json({ message: "Recreated and started", recreated: true });
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

// Stop container
app.post("/api/stop/:name", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.stop();
    containerDB[req.params.name].status = "stopped";
    saveDB();
    res.send("Stopped");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete container
// Delete container (from Docker and database)
app.post("/api/delete/:name", async (req, res) => {
  const name = req.params.name;
  
  if (!containerDB[name]) {
    return res.status(404).json({ error: "Container not found in database" });
  }

  try {
    // Try to remove from Docker first
    const container = docker.getContainer(name);
    await container.remove({ force: true });
  } catch (err) {
    if (err.statusCode !== 404 && !err.message.includes("No such container")) {
      // If it's not a "container not found" error, it's a real error
      return res.status(500).json({ error: err.message });
    }
    // If container doesn't exist in Docker, that's fine - we'll just remove from database
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
