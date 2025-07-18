const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DependencyChecker {
  constructor() {
    this.platform = os.platform(); // 'win32', 'darwin', 'linux'
    this.arch = os.arch(); // 'x64', 'arm64', etc.
    
    this.dependencies = {
      node: { required: '14.0.0', command: 'node --version' },
      npm: { required: '6.0.0', command: 'npm --version' },
      docker: { required: '20.0.0', command: 'docker --version' },
      git: { required: '2.0.0', command: 'git --version' }
    };
    
    this.installUrls = this.getPlatformUrls();
  }

  getPlatformUrls() {
    const urls = {
      win32: {
        docker: 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe',
        git: 'https://github.com/git-for-windows/git/releases/latest/download/Git-2.42.0.2-64-bit.exe',
        node: this.arch === 'arm64' 
          ? 'https://nodejs.org/dist/v18.17.1/node-v18.17.1-arm64.msi'
          : 'https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi'
      },
      darwin: {
        docker: this.arch === 'arm64'
          ? 'https://desktop.docker.com/mac/main/arm64/Docker.dmg'
          : 'https://desktop.docker.com/mac/main/amd64/Docker.dmg',
        git: 'https://git-scm.com/download/mac',
        node: this.arch === 'arm64'
          ? 'https://nodejs.org/dist/v18.17.1/node-v18.17.1.pkg'
          : 'https://nodejs.org/dist/v18.17.1/node-v18.17.1.pkg'
      },
      linux: {
        docker: 'https://docs.docker.com/engine/install/',
        git: 'https://git-scm.com/download/linux',
        node: 'https://nodejs.org/en/download/package-manager/'
      }
    };
    
    return urls[this.platform] || urls.linux;
  }

  async checkAll() {
    console.log('🔍 Checking system dependencies...');
    const results = {};
    
    for (const [name, config] of Object.entries(this.dependencies)) {
      results[name] = await this.checkDependency(name, config);
    }
    
    return results;
  }

  async checkDependency(name, config) {
    try {
      const { stdout } = await execAsync(config.command);
      const version = this.extractVersion(stdout);
      const isValid = this.compareVersions(version, config.required);
      
      return {
        installed: true,
        version,
        valid: isValid,
        required: config.required
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        valid: false,
        required: config.required,
        error: error.message
      };
    }
  }

  extractVersion(versionString) {
    // Extract version number from various output formats
    const patterns = [
      /v?(\d+\.\d+\.\d+)/,  // Standard version format
      /version (\d+\.\d+\.\d+)/i,
      /(\d+\.\d+\.\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = versionString.match(pattern);
      if (match) return match[1];
    }
    
    return versionString.trim();
  }

  compareVersions(current, required) {
    if (!current) return false;
    
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }
    
    return true;
  }

  async autoInstall(dependency) {
    console.log(`📦 Auto-installing ${dependency} on ${this.platform}...`);
    
    switch (this.platform) {
      case 'win32':
        return await this.installOnWindows(dependency);
      case 'darwin':
        return await this.installOnMac(dependency);
      case 'linux':
        return await this.installOnLinux(dependency);
      default:
        throw new Error(`Platform ${this.platform} not supported for auto-installation`);
    }
  }

  async installOnWindows(dependency) {
    switch (dependency) {
      case 'docker':
        return await this.installDockerWindows();
      case 'git':
        return await this.installGitWindows();
      case 'node':
        return await this.installNodeWindows();
      default:
        throw new Error(`Auto-installation not supported for ${dependency} on Windows`);
    }
  }

  async installOnMac(dependency) {
    switch (dependency) {
      case 'docker':
        return await this.installDockerMac();
      case 'git':
        return await this.installGitMac();
      case 'node':
        return await this.installNodeMac();
      default:
        throw new Error(`Auto-installation not supported for ${dependency} on macOS`);
    }
  }

  async installOnLinux(dependency) {
    switch (dependency) {
      case 'docker':
        return await this.installDockerLinux();
      case 'git':
        return await this.installGitLinux();
      case 'node':
        return await this.installNodeLinux();
      default:
        throw new Error(`Auto-installation not supported for ${dependency} on Linux`);
    }
  }

  // Windows Installation Methods
  async installDockerWindows() {
    try {
      // Check if Docker Desktop is already installed but not running
      const dockerPath = path.join(process.env.PROGRAMFILES, 'Docker', 'Docker', 'Docker Desktop.exe');
      
      if (fs.existsSync(dockerPath)) {
        console.log('🐳 Docker Desktop found but not running. Starting...');
        return await this.startDockerDesktop();
      }
      
      console.log('⬇️ Downloading Docker Desktop for Windows...');
      const installerPath = await this.downloadFile(this.installUrls.docker, 'DockerDesktopInstaller.exe');
      
      console.log('🔧 Installing Docker Desktop...');
      await this.runInstaller(installerPath, ['/S']); // Silent install
      
      console.log('✅ Docker Desktop installed successfully!');
      console.log('⚠️ Please restart your computer and then start Docker Desktop manually.');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to install Docker on Windows:', error.message);
      return false;
    }
  }

  async installGitWindows() {
    try {
      console.log('⬇️ Downloading Git for Windows...');
      const installerPath = await this.downloadFile(this.installUrls.git, 'GitInstaller.exe');
      
      console.log('🔧 Installing Git...');
      await this.runInstaller(installerPath, ['/VERYSILENT', '/NORESTART']);
      
      console.log('✅ Git installed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Git on Windows:', error.message);
      return false;
    }
  }

  async installNodeWindows() {
    try {
      console.log('⬇️ Downloading Node.js for Windows...');
      const installerPath = await this.downloadFile(this.installUrls.node, 'NodeJSInstaller.msi');
      
      console.log('🔧 Installing Node.js...');
      await this.runInstaller('msiexec', ['/i', installerPath, '/quiet', '/norestart']);
      
      console.log('✅ Node.js installed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Node.js on Windows:', error.message);
      return false;
    }
  }

  // macOS Installation Methods
  async installDockerMac() {
    try {
      console.log('⬇️ Downloading Docker Desktop for macOS...');
      const installerPath = await this.downloadFile(this.installUrls.docker, 'Docker.dmg');
      
      console.log('🔧 Installing Docker Desktop...');
      // Mount the DMG and copy to Applications
      await execAsync(`hdiutil mount "${installerPath}"`);
      await execAsync('cp -R "/Volumes/Docker/Docker.app" /Applications/');
      await execAsync('hdiutil unmount "/Volumes/Docker"');
      
      console.log('✅ Docker Desktop installed successfully!');
      console.log('⚠️ Please launch Docker Desktop from Applications folder.');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to install Docker on macOS:', error.message);
      return false;
    }
  }

  async installGitMac() {
    try {
      // Try to install via Homebrew first
      console.log('🍺 Attempting to install Git via Homebrew...');
      await execAsync('brew install git');
      console.log('✅ Git installed successfully via Homebrew!');
      return true;
    } catch (error) {
      console.log('⚠️ Homebrew not found. Please install Git manually from the Mac App Store or Xcode Command Line Tools.');
      console.log('💡 Or install Homebrew first: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      return false;
    }
  }

  async installNodeMac() {
    try {
      // Try to install via Homebrew first
      console.log('🍺 Attempting to install Node.js via Homebrew...');
      await execAsync('brew install node');
      console.log('✅ Node.js installed successfully via Homebrew!');
      return true;
    } catch (error) {
      console.log('⚠️ Homebrew not found. Please install Node.js manually from nodejs.org');
      console.log('💡 Or install Homebrew first: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      return false;
    }
  }

  // Linux Installation Methods
  async installDockerLinux() {
    try {
      console.log('🐧 Installing Docker on Linux...');
      
      // Detect Linux distribution
      const distro = await this.detectLinuxDistro();
      
      switch (distro) {
        case 'ubuntu':
        case 'debian':
          await this.installDockerUbuntu();
          break;
        case 'fedora':
        case 'rhel':
        case 'centos':
          await this.installDockerFedora();
          break;
        case 'arch':
          await this.installDockerArch();
          break;
        default:
          console.log('⚠️ Unsupported Linux distribution. Please install Docker manually.');
          return false;
      }
      
      console.log('✅ Docker installed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Docker on Linux:', error.message);
      return false;
    }
  }

  async installGitLinux() {
    try {
      console.log('🐧 Installing Git on Linux...');
      const distro = await this.detectLinuxDistro();
      
      switch (distro) {
        case 'ubuntu':
        case 'debian':
          await execAsync('sudo apt update && sudo apt install -y git');
          break;
        case 'fedora':
        case 'rhel':
        case 'centos':
          await execAsync('sudo dnf install -y git || sudo yum install -y git');
          break;
        case 'arch':
          await execAsync('sudo pacman -S --noconfirm git');
          break;
        default:
          console.log('⚠️ Unsupported Linux distribution. Please install Git manually.');
          return false;
      }
      
      console.log('✅ Git installed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Git on Linux:', error.message);
      return false;
    }
  }

  async installNodeLinux() {
    try {
      console.log('🐧 Installing Node.js on Linux...');
      
      // Try to install via NodeSource repository (recommended)
      await execAsync('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -');
      await execAsync('sudo apt-get install -y nodejs');
      
      console.log('✅ Node.js installed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to install Node.js on Linux:', error.message);
      console.log('💡 Please install Node.js manually using your package manager.');
      return false;
    }
  }

  async detectLinuxDistro() {
    try {
      const { stdout } = await execAsync('cat /etc/os-release');
      
      if (stdout.includes('Ubuntu') || stdout.includes('ubuntu')) return 'ubuntu';
      if (stdout.includes('Debian') || stdout.includes('debian')) return 'debian';
      if (stdout.includes('Fedora') || stdout.includes('fedora')) return 'fedora';
      if (stdout.includes('Red Hat') || stdout.includes('CentOS')) return 'rhel';
      if (stdout.includes('Arch') || stdout.includes('arch')) return 'arch';
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async installDockerUbuntu() {
    const commands = [
      'sudo apt-get update',
      'sudo apt-get install -y ca-certificates curl gnupg lsb-release',
      'sudo mkdir -p /etc/apt/keyrings',
      'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
      'sudo apt-get update',
      'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin',
      'sudo systemctl start docker',
      'sudo systemctl enable docker'
    ];
    
    for (const command of commands) {
      await execAsync(command);
    }
  }

  async installDockerFedora() {
    const commands = [
      'sudo dnf -y install dnf-plugins-core',
      'sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo',
      'sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin',
      'sudo systemctl start docker',
      'sudo systemctl enable docker'
    ];
    
    for (const command of commands) {
      await execAsync(command);
    }
  }

  async installDockerArch() {
    const commands = [
      'sudo pacman -S --noconfirm docker docker-compose',
      'sudo systemctl start docker',
      'sudo systemctl enable docker'
    ];
    
    for (const command of commands) {
      await execAsync(command);
    }
  }

  async startDockerDesktop() {
    try {
      let dockerPath;
      
      switch (this.platform) {
        case 'win32':
          dockerPath = path.join(process.env.PROGRAMFILES, 'Docker', 'Docker', 'Docker Desktop.exe');
          break;
        case 'darwin':
          dockerPath = '/Applications/Docker.app/Contents/MacOS/Docker Desktop';
          break;
        case 'linux':
          // On Linux, Docker is typically a service
          console.log('🚀 Starting Docker service on Linux...');
          await execAsync('sudo systemctl start docker');
          await this.waitForDocker();
          return true;
        default:
          throw new Error(`Platform ${this.platform} not supported`);
      }
      
      if (!fs.existsSync(dockerPath)) {
        throw new Error('Docker Desktop not found');
      }
      
      console.log('🚀 Starting Docker Desktop...');
      spawn(dockerPath, [], { detached: true, stdio: 'ignore' });
      
      // Wait for Docker to start
      console.log('⏳ Waiting for Docker to start...');
      await this.waitForDocker();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start Docker Desktop:', error.message);
      return false;
    }
  }

  async waitForDocker(maxWaitTime = 120000) { // 2 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        await execAsync('docker info');
        console.log('✅ Docker is running!');
        return true;
      } catch (error) {
        // Docker not ready yet, wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Docker failed to start within the timeout period');
  }

  async downloadFile(url, filename) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, filename);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          return https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            
            file.on('finish', () => {
              file.close();
              resolve(filePath);
            });
          }).on('error', reject);
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      }).on('error', reject);
    });
  }

  async runInstaller(installerPath, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(installerPath, args, { stdio: 'inherit' });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installer exited with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  async generateReport(results) {
    console.log('\n📋 Dependency Check Report:');
    console.log('=' .repeat(50));
    
    const missing = [];
    const outdated = [];
    
    for (const [name, result] of Object.entries(results)) {
      const status = result.installed ? 
        (result.valid ? '✅' : '⚠️') : '❌';
      
      console.log(`${status} ${name.padEnd(10)} | ${result.installed ? 
        `v${result.version} (required: v${result.required})` : 
        'Not installed'}`);
      
      if (!result.installed) {
        missing.push(name);
      } else if (!result.valid) {
        outdated.push(name);
      }
    }
    
    if (missing.length > 0 || outdated.length > 0) {
      console.log('\n🔧 Issues found:');
      if (missing.length > 0) {
        console.log(`   Missing: ${missing.join(', ')}`);
      }
      if (outdated.length > 0) {
        console.log(`   Outdated: ${outdated.join(', ')}`);
      }
      
      return { missing, outdated, hasIssues: true };
    } else {
      console.log('\n🎉 All dependencies are satisfied!');
      return { missing: [], outdated: [], hasIssues: false };
    }
  }

  async fixIssues(missing, outdated) {
    const toInstall = [...missing, ...outdated];
    
    if (toInstall.length === 0) return true;
    
    console.log('\n🛠️ Attempting to fix dependency issues...');
    
    for (const dependency of toInstall) {
      if (['docker', 'git', 'node'].includes(dependency)) {
        try {
          await this.autoInstall(dependency);
        } catch (error) {
          console.error(`❌ Failed to install ${dependency}:`, error.message);
          return false;
        }
      } else {
        console.log(`⚠️ Please install ${dependency} manually`);
      }
    }
    
    return true;
  }
}

module.exports = DependencyChecker;
