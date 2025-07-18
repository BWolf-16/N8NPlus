import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:9999/api";

export default function App() {
  const [dark, setDark] = useState(true);
  const [instances, setInstances] = useState([]);
  const [activeInstance, setActiveInstance] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [baseAddress, setBaseAddress] = useState("localhost");
  const [editingBaseAddress, setEditingBaseAddress] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const name = prompt("Enter container name:");
    if (!name) return;

    try {
      const response = await fetch(`${API_BASE}/containers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      if (response.ok) {
        fetchContainers();
      } else {
        alert("Error creating container");
      }
    } catch (err) {
      console.error("Error creating container:", err);
    }
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
    } catch (err) {
      console.error("Error stopping container:", err);
    }
  };

  const deleteContainer = async (name) => {
    if (!confirm(`Delete container ${name}?`)) return;
    
    try {
      await fetch(`${API_BASE}/delete/${name}`, { method: "POST" });
      fetchContainers();
      if (activeInstance?.name === name) {
        setActiveInstance(null);
      }
    } catch (err) {
      console.error("Error deleting container:", err);
    }
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
  const handleOpen = (inst) => setActiveInstance(inst);
  const handleClose = () => setActiveInstance(null);

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
            <button className="new-btn" onClick={createContainer}>+ Create Instance</button>
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
                return (
                  <div key={inst.name} className="card">
                    <strong>{inst.name}</strong>
                    <p>Port: {inst.port}</p>
                    <p>Address: {currentBaseAddress}</p>
                    <p>Status: <span className={inst.status === "running" ? "dot-green" : "dot-red"} /></p>
                    <div className="btn-row">
                      {inst.status === "running" ? (
                        <>
                          <button onClick={() => handleOpen(inst)}>Open</button>
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

        {activeInstance && (
          <div className="viewer">
            <div className="viewer-bar">
              <span>{activeInstance.name} ({(activeInstance.baseAddress || baseAddress)}:{activeInstance.port})</span>
              <button onClick={handleClose}>×</button>
            </div>
            <iframe
              src={`http://${activeInstance.baseAddress || baseAddress}:${activeInstance.port}`}
              title={activeInstance.name}
              className="viewer-frame"
            />
          </div>
        )}
      </main>
    </div>
  );
}