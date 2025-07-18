import React, { useState } from "react";

export default function App() {
  const [dark, setDark] = useState(true);
  const [instances, setInstances] = useState([
    { name: "n8n-dev", port: 5678, status: "running" },
    { name: "n8n-ai", port: 5679, status: "stopped" }
  ]);
  const [activeInstance, setActiveInstance] = useState(null);

  const toggleTheme = () => setDark(!dark);

  const handleOpen = (inst) => setActiveInstance(inst);
  const handleClose = () => setActiveInstance(null);

  return (
    <div className={dark ? "dark" : ""}>
      <main className="app">
        <header>
          <h1>🐳 N8N+</h1>
          <div>
            <button onClick={toggleTheme}>Toggle Theme</button>
          </div>
        </header>

        <div className="container-section">
          <button className="new-btn">+ Create Instance</button>
          <div className="cards">
            {instances.map((inst) => (
              <div key={inst.name} className="card">
                <strong>{inst.name}</strong>
                <p>Port: {inst.port}</p>
                <p>Status: <span className={inst.status === "running" ? "dot-green" : "dot-red"} /></p>
                <div className="btn-row">
                  {inst.status === "running" ? (
                    <>
                      <button onClick={() => handleOpen(inst)}>Open</button>
                      <button>Stop</button>
                    </>
                  ) : (
                    <button>Start</button>
                  )}
                  <button>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeInstance && (
          <div className="viewer">
            <div className="viewer-bar">
              <span>{activeInstance.name} (localhost:{activeInstance.port})</span>
              <button onClick={handleClose}>×</button>
            </div>
            <iframe
              src={`http://localhost:${activeInstance.port}`}
              title={activeInstance.name}
              className="viewer-frame"
            />
          </div>
        )}
      </main>
    </div>
  );
}