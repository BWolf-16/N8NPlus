import React, { useState, useEffect } from "react";
import SetupChecker from "../components/SetupChecker";
import UpdateNotification from "../components/UpdateNotification";

// Dynamic API base - will be set based on current host
let API_BASE = "http://localhost:9999/api";

// Function to update API base when connecting to remote host
function updateAPIBase(host) {
  // Extract IP/hostname from host (remove port if it's 3000)
  const hostPart = host.includes(':3000') ? host.replace(':3000', '') : host.split(':')[0];
  API_BASE = `http://${hostPart}:9999/api`;
  console.log(`🌐 API endpoint updated to: ${API_BASE}`);
}

// Check if we're running in Electron and get current host
if (window.electronAPI) {
  window.electronAPI.getCurrentHost?.()?.then(host => {
    if (host && host !== 'localhost:3000') {
      updateAPIBase(host);
    }
  }).catch(() => {
    // Fallback to localhost if unable to get current host
    console.log('Using localhost API endpoint');
  });
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [instances, setInstances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [baseAddress, setBaseAddress] = useState("localhost");
  const [editingBaseAddress, setEditingBaseAddress] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContainerName, setNewContainerName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [containerToEdit, setContainerToEdit] = useState(null);
  const [editContainerName, setEditContainerName] = useState("");
  const [editContainerPort, setEditContainerPort] = useState("");
  const [editContainerAddress, setEditContainerAddress] = useState("");
  const [openWindows, setOpenWindows] = useState(new Map()); // Track opened windows
  const [setupComplete, setSetupComplete] = useState(false); // Track setup status
  const [currentHost, setCurrentHost] = useState('localhost:3000'); // Track current host
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, connecting
  const [dockerStatus, setDockerStatus] = useState('checking'); // checking, running, not-running, not-installed
  const [showDockerDialog, setShowDockerDialog] = useState(false);
  const [dockerMessage, setDockerMessage] = useState("");
  const [dockerInstalling, setDockerInstalling] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    // Get current host from Electron if available
    if (window.electronAPI?.getCurrentHost) {
      window.electronAPI.getCurrentHost().then(host => {
        setCurrentHost(host);
        updateAPIBase(host);
      }).catch(() => {
        setCurrentHost('localhost:3000');
      });
    }
    
    // Only fetch data if setup is complete
    if (setupComplete) {
      fetchContainers();
      fetchConfig();
      checkConflicts();
      checkDockerStatus(); // Check Docker status on startup
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(() => {
        fetchContainers();
        checkConflicts();
        checkDockerStatus(); // Also check Docker status periodically
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [setupComplete]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus('connecting');
        const response = await fetch(`${API_BASE}/health`, { 
          method: 'GET',
          timeout: 5000 
        });
        if (response.ok) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (err) {
        setConnectionStatus('disconnected');
      }
    };
    
    if (setupComplete) {
      checkConnection();
      const connectionInterval = setInterval(checkConnection, 15000); // Check every 15 seconds
      return () => clearInterval(connectionInterval);
    }
  }, [setupComplete, API_BASE]);

  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  const fetchContainers = async () => {
    try {
      const response = await fetch(`${API_BASE}/containers`);
      const data = await response.json();
      setInstances(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching containers:", err);
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const data = await response.json();
      setBaseAddress(data.baseAddress || "localhost");
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  };

  const checkDockerStatus = async () => {
    try {
      setDockerStatus('checking');
      const response = await fetch(`${API_BASE}/docker/status`);
      const data = await response.json();
      
      if (data.status === 'running') {
        setDockerStatus('running');
        setDockerMessage(`Docker is running (${data.version})`);
      } else if (data.status === 'not-running') {
        setDockerStatus('not-running');
        setDockerMessage(data.message || 'Docker is installed but not running');
        setShowDockerDialog(true);
      } else if (data.status === 'not-installed') {
        setDockerStatus('not-installed');
        setDockerMessage(data.message || 'Docker is not installed');
        setShowDockerDialog(true);
      }
    } catch (err) {
      console.error("Error checking Docker status:", err);
      setDockerStatus('not-running');
      setDockerMessage('Unable to connect to Docker');
      setShowDockerDialog(true);
    }
  };

  const startDocker = async () => {
    try {
      setDockerInstalling(true);
      const response = await fetch(`${API_BASE}/docker/start`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setDockerMessage(data.message);
        // Wait a bit and recheck status
        setTimeout(() => {
          checkDockerStatus();
        }, 5000);
      } else {
        setDockerMessage(data.message);
      }
    } catch (err) {
      console.error("Error starting Docker:", err);
      setDockerMessage("Failed to start Docker: " + err.message);
    } finally {
      setDockerInstalling(false);
    }
  };

  const installDocker = async () => {
    try {
      setDockerInstalling(true);
      const response = await fetch(`${API_BASE}/docker/install`, { method: 'POST' });
      const data = await response.json();
      
      if (data.action === 'manual-install-required') {
        setDockerMessage(data.message);
        if (data.downloadUrl) {
          const shouldDownload = window.confirm(`${data.message}\n\nWould you like to open the download page?`);
          if (shouldDownload) {
            window.open(data.downloadUrl, '_blank');
          }
        }
      } else if (data.success) {
        setDockerMessage(data.message);
        setTimeout(() => {
          checkDockerStatus();
        }, 3000);
      } else {
        setDockerMessage(data.message);
      }
    } catch (err) {
      console.error("Error installing Docker:", err);
      setDockerMessage("Failed to install Docker: " + err.message);
    } finally {
      setDockerInstalling(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const response = await fetch(`${API_BASE}/conflicts`);
      const data = await response.json();
      setConflicts(data);
    } catch (err) {
      console.error("Error checking conflicts:", err);
    }
  };

  const updateBaseAddress = async (newAddress) => {
    try {
      const response = await fetch(`${API_BASE}/config/baseAddress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseAddress: newAddress })
      });
      
      if (response.ok) {
        setBaseAddress(newAddress);
        setEditingBaseAddress(false);
        // Update all containers with new base address
        fetchContainers();
      }
    } catch (err) {
      console.error("Error updating base address:", err);
    }
  };

  const createContainer = async () => {
    if (!newContainerName.trim()) {
      alert("Please enter a container name");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/containers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newContainerName.trim() })
      });
      
      if (response.ok) {
        fetchContainers();
        setShowCreateModal(false);
        setNewContainerName("");
      } else {
        const errorText = await response.text();
        alert(`Error creating container: ${errorText}`);
      }
    } catch (err) {
      console.error("Error creating container:", err);
      alert("Error creating container");
    }
  };

  const openCreateModal = () => {
    setNewContainerName("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewContainerName("");
  };

  const startContainer = async (name) => {
    try {
      const response = await fetch(`${API_BASE}/start/${name}`, { 
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (response.status === 409 && data.error === "docker_not_found") {
        // Docker container not found, ask user for confirmation
        const shouldRecreate = window.confirm(
          `Docker container "${name}" not found. Do you want to create one?`
        );
        
        if (shouldRecreate) {
          // Retry with forceRecreate flag
          const retryResponse = await fetch(`${API_BASE}/start/${name}`, { 
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ forceRecreate: true })
          });
          
          const retryData = await retryResponse.json();
          if (retryResponse.ok) {
            console.log(retryData.message);
            if (retryData.recreated) {
              alert(`Container "${name}" has been recreated and started successfully!`);
            }
          } else {
            throw new Error(retryData.error || 'Failed to recreate container');
          }
        }
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to start container');
      }
      
      fetchContainers();
    } catch (err) {
      console.error("Error starting container:", err);
      alert(`Error starting container: ${err.message}`);
    }
  };

  const stopContainer = async (name) => {
    try {
      await fetch(`${API_BASE}/stop/${name}`, { method: "POST" });
      fetchContainers();
      
      // Try to close the associated window if it exists and is still open
      const windowToClose = openWindows.get(name);
      if (windowToClose && !windowToClose.closed) {
        try {
          windowToClose.close();
          // Remove from tracking
          setOpenWindows(prev => {
            const updated = new Map(prev);
            updated.delete(name);
            return updated;
          });
        } catch (err) {
          // Window couldn't be closed (likely due to browser restrictions)
          alert(`Container ${name} has been stopped. Please manually close the n8n browser window for this container.`);
        }
      }
    } catch (err) {
      console.error("Error stopping container:", err);
    }
  };

  const deleteContainer = async (name) => {
    setContainerToDelete(name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!containerToDelete) return;

    try {
      // Try to close any open window for this container
      const windowToClose = openWindows.get(containerToDelete);
      if (windowToClose && !windowToClose.closed) {
        try {
          windowToClose.close();
        } catch (err) {
          console.log("Could not close window automatically");
        }
      }
      
      await fetch(`${API_BASE}/delete/${containerToDelete}`, { method: "POST" });
      fetchContainers();
      
      // Clean up window tracking
      setOpenWindows(prev => {
        const updated = new Map(prev);
        updated.delete(containerToDelete);
        return updated;
      });
      
      setShowDeleteModal(false);
      setContainerToDelete(null);
    } catch (err) {
      console.error("Error deleting container:", err);
      alert("Error deleting container");
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setContainerToDelete(null);
  };

  const editContainer = (container) => {
    setContainerToEdit(container);
    setEditContainerName(container.name);
    setEditContainerPort(container.port.toString());
    setEditContainerAddress(container.baseAddress || baseAddress);
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!containerToEdit) return;

    const newName = editContainerName.trim();
    const newPort = parseInt(editContainerPort);
    const newBaseAddress = editContainerAddress.trim();

    // Validation
    if (!newName) {
      alert("Container name cannot be empty");
      return;
    }

    if (!newPort || newPort < 1024 || newPort > 65535) {
      alert("Port must be between 1024 and 65535");
      return;
    }

    if (!newBaseAddress) {
      alert("Base address cannot be empty");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/edit/${containerToEdit.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName: newName !== containerToEdit.name ? newName : undefined,
          newPort: newPort !== containerToEdit.port ? newPort : undefined,
          newBaseAddress: newBaseAddress !== containerToEdit.baseAddress ? newBaseAddress : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || "Container updated successfully");
        fetchContainers();
        checkConflicts();
        setShowEditModal(false);
        setContainerToEdit(null);
        
        // Update window tracking if name changed
        if (newName !== containerToEdit.name) {
          const windowForOldName = openWindows.get(containerToEdit.name);
          if (windowForOldName) {
            setOpenWindows(prev => {
              const updated = new Map(prev);
              updated.delete(containerToEdit.name);
              updated.set(newName, windowForOldName);
              return updated;
            });
          }
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to update container"}`);
      }
    } catch (err) {
      console.error("Error editing container:", err);
      alert("Error updating container");
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setContainerToEdit(null);
    setEditContainerName("");
    setEditContainerPort("");
    setEditContainerAddress("");
  };

  const resolveConflict = async (name) => {
    try {
      const response = await fetch(`${API_BASE}/conflicts/reassign/${name}`, { method: "POST" });
      if (response.ok) {
        fetchContainers();
        checkConflicts();
      }
    } catch (err) {
      console.error("Error resolving conflict:", err);
    }
  };

  const refreshData = () => {
    setLoading(true);
    fetchContainers();
    checkConflicts();
  };

  // Filter instances based on search term
  const filteredInstances = instances.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inst.baseAddress || baseAddress).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTheme = () => setDark(!dark);

  const pingContainer = async (container) => {
    try {
      const response = await fetch(`${API_BASE}/ping/${container.name}`);
      if (response.ok) {
        const data = await response.json();
        return data.accessible;
      }
      return false;
    } catch (err) {
      console.error("Error pinging container:", err);
      return false;
    }
  };

  const handleOpenWithCheck = async (inst) => {
    // Check if container is accessible
    const isAccessible = await pingContainer(inst);
    if (!isAccessible) {
      alert(`Container ${inst.name} is not responding. Please make sure it's started and wait a moment for n8n to initialize.`);
      return;
    }
    
    // Open directly in a new browser window
    const url = `http://${inst.baseAddress || baseAddress}:${inst.port}`;
    const newWindow = window.open(url, `n8n-${inst.name}`, 'width=1200,height=800');
    
    // Track the opened window
    if (newWindow) {
      setOpenWindows(prev => new Map(prev.set(inst.name, newWindow)));
    }
  };

  return (
    <div className={dark ? "dark" : ""}>
      {/* Update notification component */}
      <UpdateNotification />
      
      {/* Show setup checker if setup is not complete */}
      {!setupComplete && (
        <SetupChecker onSetupComplete={handleSetupComplete} />
      )}
      
      <main className="app">
        <header>
          <h1>🐳 N8N+</h1>
          <div className="header-controls">
            <div className="connection-status">
              <span className={`status-indicator ${connectionStatus}`}>
                {connectionStatus === 'connected' && '🟢'}
                {connectionStatus === 'connecting' && '🟡'}
                {connectionStatus === 'disconnected' && '🔴'}
              </span>
              <span className="host-info">
                {currentHost} 
                {connectionStatus === 'connected' && ' (Connected)'}
                {connectionStatus === 'connecting' && ' (Connecting...)'}
                {connectionStatus === 'disconnected' && ' (Disconnected)'}
              </span>
            </div>
            <div className="connection-status" style={{cursor: dockerStatus !== 'running' ? 'pointer' : 'default'}} 
                 onClick={() => dockerStatus !== 'running' && setShowDockerDialog(true)}>
              <span className={`status-indicator ${dockerStatus === 'running' ? 'connected' : dockerStatus === 'checking' ? 'connecting' : 'disconnected'}`}>
                {dockerStatus === 'running' && '🐳'}
                {dockerStatus === 'checking' && '🟡'}
                {(dockerStatus === 'not-running' || dockerStatus === 'not-installed') && '🔴'}
              </span>
              <span className="host-info">
                Docker {dockerStatus === 'running' && '(Running)'}
                {dockerStatus === 'checking' && '(Checking...)'}
                {dockerStatus === 'not-running' && '(Stopped)'}
                {dockerStatus === 'not-installed' && '(Not Installed)'}
                {dockerStatus !== 'running' && ' - Click to manage'}
              </span>
            </div>
            <div className="base-address-section">
              {editingBaseAddress ? (
                <div className="edit-base-address">
                  <input
                    type="text"
                    value={baseAddress}
                    onChange={(e) => setBaseAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && updateBaseAddress(baseAddress)}
                    placeholder="localhost"
                    className="base-address-input"
                  />
                  <button onClick={() => updateBaseAddress(baseAddress)}>Save</button>
                  <button onClick={() => setEditingBaseAddress(false)}>Cancel</button>
                </div>
              ) : (
                <div className="base-address-display">
                  <span>Base: {baseAddress}</span>
                  <button onClick={() => setEditingBaseAddress(true)}>Edit</button>
                </div>
              )}
            </div>
            <button onClick={toggleTheme}>Toggle Theme</button>
          </div>
        </header>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="conflicts-alert">
            <h3>⚠️ Port Conflicts Detected</h3>
            {conflicts.map(conflict => (
              <div key={conflict.name} className="conflict-item">
                <span>{conflict.name} (port {conflict.port})</span>
                <button onClick={() => resolveConflict(conflict.name)}>
                  Reassign Port
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="container-section">
          <div className="section-header">
            <h2>Containers ({filteredInstances.length})</h2>
            {searchTerm && (
              <span className="search-info">
                Showing {filteredInstances.length} of {instances.length} containers
              </span>
            )}
          </div>
          <div className="controls-row">
            <button className="new-btn" onClick={openCreateModal}>+ Create Instance</button>
            <div className="search-section">
              <input
                type="text"
                placeholder="Search containers or addresses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button onClick={refreshData} disabled={loading}>
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
          
          {loading ? (
            <p>Loading containers...</p>
          ) : (
            <div className="cards">
              {filteredInstances.map((inst) => {
                const currentBaseAddress = inst.baseAddress || baseAddress;
                const hasOpenWindow = openWindows.has(inst.name) && !openWindows.get(inst.name)?.closed;
                return (
                  <div key={inst.name} className="card">
                    <div className="card-header">
                      <strong>{inst.name}</strong>
                      <div className="status-icons">
                        {hasOpenWindow && <span className="window-indicator" title="Browser window is open">🔗</span>}
                        {inst.status === "not-found" && (
                          <span 
                            className="warning-indicator" 
                            title={inst.errorMessage || "Docker container not found"}
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </div>
                    <p>Port: {inst.port}</p>
                    <p>Address: {currentBaseAddress}</p>
                    <p>Status: <span className={
                      inst.status === "running" ? "dot-green" : 
                      inst.status === "not-found" ? "dot-orange" : "dot-red"
                    } /></p>
                    <div className="btn-row">
                      {inst.status === "running" ? (
                        <>
                          <button onClick={() => handleOpenWithCheck(inst)}>Open</button>
                          <button onClick={() => stopContainer(inst.name)}>Stop</button>
                        </>
                      ) : (
                        <button onClick={() => startContainer(inst.name)}>
                          {inst.status === "not-found" ? "Recreate & Start" : "Start"}
                        </button>
                      )}
                      <button className="edit-btn" onClick={() => editContainer(inst)}>Edit</button>
                      <button className="delete-btn" onClick={() => deleteContainer(inst.name)}>Delete</button>
                    </div>
                  </div>
                );
              })}
              {filteredInstances.length === 0 && !loading && (
                <p>No containers found matching "{searchTerm}"</p>
              )}
        </div>
      )}

      {/* Edit Instance Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit N8N Instance</h3>
            <div className="modal-content">
              <label>Instance Name:</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Instance Name"
                value={editContainerName}
                onChange={(e) => setEditContainerName(e.target.value)}
                required
              />
              <br /><br />
              <label>Port:</label>
              <input
                className="modal-input"
                type="number"
                placeholder="Port"
                value={editContainerPort}
                onChange={(e) => setEditContainerPort(e.target.value)}
                required
              />
              <br /><br />
              <label>Base Address:</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Base Address (http://192.168.1.100 or http://localhost)"
                value={editContainerAddress}
                onChange={(e) => setEditContainerAddress(e.target.value)}
                required
              />
            </div>
            <div className="modal-buttons">
              <button onClick={confirmEdit}>Update Instance</button>
              <button onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>        {/* Create Container Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Create New Container</h3>
              <div className="modal-content">
                <label>Container Name:</label>
                <input
                  type="text"
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createContainer()}
                  placeholder="e.g., n8n-production"
                  className="modal-input"
                  autoFocus
                />
              </div>
              <div className="modal-buttons">
                <button onClick={createContainer} disabled={!newContainerName.trim()}>
                  Create
                </button>
                <button onClick={closeCreateModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Confirm Delete</h3>
              <div className="modal-content">
                <p>Are you sure you want to delete container <strong>{containerToDelete}</strong>?</p>
                <p style={{color: '#ff6b6b', fontSize: '0.9rem'}}>This action cannot be undone.</p>
              </div>
              <div className="modal-buttons">
                <button onClick={confirmDelete} style={{background: '#ff6b6b'}}>
                  Delete
                </button>
                <button onClick={cancelDelete}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Docker Status Dialog */}
        {showDockerDialog && (
          <div className="modal-overlay" onClick={() => setShowDockerDialog(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Docker Status</h3>
                <button className="close-button" onClick={() => setShowDockerDialog(false)}>×</button>
              </div>
              <div className="modal-content">
                <p>{dockerMessage}</p>
                {dockerStatus === 'not-running' && (
                  <div className="modal-buttons">
                    <button 
                      onClick={startDocker}
                      disabled={dockerInstalling}
                      style={{background: '#4CAF50'}}
                    >
                      Start Docker
                    </button>
                    <button onClick={() => setShowDockerDialog(false)}>
                      Cancel
                    </button>
                  </div>
                )}
                {dockerStatus === 'not-installed' && (
                  <div className="modal-buttons">
                    <button 
                      onClick={installDocker}
                      disabled={dockerInstalling}
                      style={{background: '#2196F3'}}
                    >
                      {dockerInstalling ? 'Installing...' : 'Install Docker'}
                    </button>
                    <button onClick={() => setShowDockerDialog(false)}>
                      Cancel
                    </button>
                  </div>
                )}
                {dockerInstalling && (
                  <div style={{textAlign: 'center', marginTop: '10px'}}>
                    <div className="loading-indicator">
                      <span>Please wait...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}