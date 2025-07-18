const express = require("express");
const Docker = require("dockerode");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const net = require("net");
const portfinder = require("portfinder");

const app = express();
const docker = new Docker();
const port = 9999;
const DATA_FILE = path.join(__dirname, "containers.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

app.use(cors());
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

// List containers
app.get("/api/containers", (req, res) => {
  res.json(Object.values(containerDB));
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

// Start container
app.post("/api/start/:name", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.start();
    containerDB[req.params.name].status = "running";
    saveDB();
    res.send("Started");
  } catch (err) {
    res.status(500).json({ error: err.message });
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
app.post("/api/delete/:name", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.remove({ force: true });
    delete containerDB[req.params.name];
    saveDB();
    res.send("Deleted");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, async () => {
  console.log(`🔧 N8NPlus backend listening on http://localhost:${port}`);
  
  // Check for port conflicts on startup
  try {
    const conflicts = await checkPortConflicts();
    if (conflicts.length > 0) {
      console.log("⚠️  Port conflicts detected:", conflicts);
    }
  } catch (err) {
    console.error("Error checking port conflicts:", err);
  }
});
