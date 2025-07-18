import React, { useState } from "react";
export default function App() {
  const [dark, setDark] = useState(true);
  const toggleTheme = () => setDark(!dark);

  return (
    <div className={dark ? "dark" : ""}>
      <main className="app">
        <header>
          <h1>🐳 n8n Master Manager</h1>
          <button onClick={toggleTheme}>Toggle Theme</button>
        </header>
        <section>
          <p>UI placeholder here. All features will go here.</p>
        </section>
      </main>
    </div>
  );
}