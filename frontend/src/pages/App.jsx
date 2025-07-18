import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:9999/api";

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
  const [openWindows, setOpenWindows] = useState(new Map()); // Track opened windows

  // Fetch data on component mount
  useEffect(() => {
    fetchContainers();
    fetchConfig();
    checkConflicts();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchContainers();
      checkConflicts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

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
      await fetch(`${API_BASE}/start/${name}`, { method: "POST" });
      fetchContainers();
    } catch (err) {
      console.error("Error starting container:", err);
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
      <main className="app">
        <header>
          <h1>🐳 N8N+</h1>
          <div className="header-controls">
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
                      {hasOpenWindow && <span className="window-indicator" title="Browser window is open">🔗</span>}
                    </div>
                    <p>Port: {inst.port}</p>
                    <p>Address: {currentBaseAddress}</p>
                    <p>Status: <span className={inst.status === "running" ? "dot-green" : "dot-red"} /></p>
                    <div className="btn-row">
                      {inst.status === "running" ? (
                        <>
                          <button onClick={() => handleOpenWithCheck(inst)}>Open</button>
                          <button onClick={() => stopContainer(inst.name)}>Stop</button>
                        </>
                      ) : (
                        <button onClick={() => startContainer(inst.name)}>Start</button>
                      )}
                      <button onClick={() => deleteContainer(inst.name)}>Delete</button>
                    </div>
                  </div>
                );
              })}
              {filteredInstances.length === 0 && !loading && (
                <p>No containers found matching "{searchTerm}"</p>
              )}
            </div>
          )}
        </div>

        {/* Create Container Modal */}
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
      </main>
    </div>
  );
}