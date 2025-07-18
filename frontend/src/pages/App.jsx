import React, { useState } from "react";

export default function App() {
  const [dark, setDark] = useState(true);
  const toggleTheme = () => setDark(!dark);

  return (
    <div className={dark ? "dark" : ""}>
      <main className="app">
        <header>
          <h1>🐳 N8N+</h1>
          <button onClick={toggleTheme}>Toggle Theme</button>
        </header>
        <section>
          <p>UI placeholder for container manager.</p>
        </section>
      </main>
    </div>
  );
}