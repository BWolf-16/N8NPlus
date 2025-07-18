import React, { useState, useEffect } from 'react';

const SetupChecker = ({ onSetupComplete }) => {
  const [dependencies, setDependencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [dockerStatus, setDockerStatus] = useState({ running: false, checking: true });
  const [setupComplete, setSetupComplete] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Win')) setPlatform('Windows');
    else if (userAgent.includes('Mac')) setPlatform('macOS');
    else if (userAgent.includes('Linux')) setPlatform('Linux');
    else setPlatform('Unknown');

    checkAllDependencies();
    checkDockerStatus();
  }, []);

  const checkAllDependencies = async () => {
    if (!window.electronSetup) {
      console.log('Running in browser mode - skipping dependency check');
      setSetupComplete(true);
      setLoading(false);
      if (onSetupComplete) onSetupComplete();
      return;
    }

    try {
      const result = await window.electronSetup.checkDependencies();
      if (result.success) {
        setDependencies(result.results);
        
        // Check if all dependencies are satisfied
        const allSatisfied = Object.values(result.results).every(dep => dep.installed && dep.valid);
        setSetupComplete(allSatisfied);
        
        if (allSatisfied && onSetupComplete) {
          onSetupComplete();
        }
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDockerStatus = async () => {
    if (!window.electronSetup) return;

    try {
      const status = await window.electronSetup.checkDockerStatus();
      setDockerStatus({ ...status, checking: false });
    } catch (error) {
      setDockerStatus({ running: false, checking: false, error: error.message });
    }
  };

  const handleAutoInstall = async () => {
    if (!window.electronSetup) return;

    setInstalling(true);
    
    try {
      // Get missing dependencies
      const missing = Object.entries(dependencies)
        .filter(([_, dep]) => !dep.installed || !dep.valid)
        .map(([name, _]) => name);

      if (missing.length > 0) {
        // Show confirmation dialog
        const choice = await window.electronSetup.showSetupDialog(missing);
        
        if (choice === 0) { // Install Automatically
          const result = await window.electronSetup.autoInstallDependencies();
          
          if (result.success) {
            alert(`Successfully installed: ${result.installed.join(', ')}`);
            // Re-check dependencies
            await checkAllDependencies();
            await checkDockerStatus();
          } else {
            alert(`Installation failed: ${result.error}`);
          }
        } else if (choice === 1) { // Install Manually
          // Open manual installation links
          for (const dep of missing) {
            await window.electronSetup.openManualInstall(dep);
          }
        }
      }
    } catch (error) {
      alert(`Setup error: ${error.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleStartDocker = async () => {
    if (!window.electronSetup) return;

    setDockerStatus(prev => ({ ...prev, starting: true }));
    
    try {
      const result = await window.electronSetup.startDocker();
      
      if (result.success) {
        setDockerStatus({ running: true, checking: false });
      } else {
        alert(`Failed to start Docker: ${result.error}`);
        setDockerStatus(prev => ({ ...prev, starting: false }));
      }
    } catch (error) {
      alert(`Error starting Docker: ${error.message}`);
      setDockerStatus(prev => ({ ...prev, starting: false }));
    }
  };

  const handleRefreshCheck = async () => {
    setLoading(true);
    await checkAllDependencies();
    await checkDockerStatus();
  };

  if (loading) {
    return (
      <div className="setup-checker loading">
        <div className="setup-content">
          <h2>🔍 Checking System Dependencies</h2>
          <div className="loading-spinner"></div>
          <p>Please wait while we verify your system setup...</p>
        </div>
      </div>
    );
  }

  if (setupComplete && dockerStatus.running) {
    return null; // Don't show anything if setup is complete
  }

  const missingDeps = Object.entries(dependencies).filter(([_, dep]) => !dep.installed || !dep.valid);
  const hasMissingDeps = missingDeps.length > 0;

  return (
    <div className="setup-checker">
      <div className="setup-content">
        <h2>🛠️ System Setup</h2>
        
        {/* Dependency Status */}
        <div className="dependency-status">
          <h3>Dependencies</h3>
          <div className="dep-list">
            {Object.entries(dependencies).map(([name, dep]) => (
              <div key={name} className={`dep-item ${dep.installed && dep.valid ? 'satisfied' : 'missing'}`}>
                <span className="dep-icon">
                  {dep.installed && dep.valid ? '✅' : '❌'}
                </span>
                <span className="dep-name">{name}</span>
                <span className="dep-version">
                  {dep.installed ? `v${dep.version}` : 'Not installed'}
                  {dep.installed && !dep.valid && ` (requires v${dep.required}+)`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Docker Status */}
        <div className="docker-status">
          <h3>Docker Status</h3>
          <div className={`status-item ${dockerStatus.running ? 'running' : 'stopped'}`}>
            <span className="status-icon">
              {dockerStatus.checking ? '⏳' : 
               dockerStatus.starting ? '🔄' :
               dockerStatus.running ? '🟢' : '🔴'}
            </span>
            <span className="status-text">
              {dockerStatus.checking ? 'Checking Docker...' :
               dockerStatus.starting ? 'Starting Docker...' :
               dockerStatus.running ? 'Docker is running' : 
               'Docker is not running'}
            </span>
            {!dockerStatus.running && !dockerStatus.checking && !dockerStatus.starting && (
              <button onClick={handleStartDocker} className="start-docker-btn">
                Start Docker
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="setup-actions">
          {hasMissingDeps && (
            <button 
              onClick={handleAutoInstall} 
              disabled={installing}
              className="auto-install-btn"
            >
              {installing ? 'Installing...' : '🚀 Auto-Install Missing Dependencies'}
            </button>
          )}
          
          <button onClick={handleRefreshCheck} className="refresh-btn">
            🔄 Refresh Check
          </button>
        </div>

        {/* Instructions */}
        <div className="setup-instructions">
          <h4>💡 Setup Instructions for {platform}:</h4>
          <ul>
            <li>N8NPlus requires Node.js, npm, Git, and Docker to function properly</li>
            <li>Click "Auto-Install" to automatically download and install missing dependencies</li>
            <li>Docker Desktop needs to be running before you can create containers</li>
            {platform === 'Windows' && (
              <>
                <li>Some installations may require administrator privileges</li>
                <li>Windows Defender may show security warnings - this is normal for installers</li>
              </>
            )}
            {platform === 'macOS' && (
              <>
                <li>macOS may ask for admin password during installation</li>
                <li>Consider installing Homebrew for easier package management</li>
                <li>You may need to allow apps from "System Preferences → Security & Privacy"</li>
              </>
            )}
            {platform === 'Linux' && (
              <>
                <li>Most installations require sudo privileges</li>
                <li>Package managers vary by distribution (apt, dnf, pacman, etc.)</li>
                <li>Docker may need to be added to your user group: <code>sudo usermod -aG docker $USER</code></li>
              </>
            )}
            {hasMissingDeps && (
              <li>After installation, you may need to restart the application</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SetupChecker;
