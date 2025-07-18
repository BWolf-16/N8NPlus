const DependencyChecker = require('./dependency-checker');
const { spawn } = require('child_process');
const path = require('path');

class SetupManager {
  constructor() {
    this.checker = new DependencyChecker();
  }

  async runFullSetup() {
    console.log('🚀 N8NPlus Setup Manager Starting...\n');
    
    try {
      // Step 1: Check dependencies
      const results = await this.checker.checkAll();
      const report = await this.checker.generateReport(results);
      
      // Step 2: Fix issues if any
      if (report.hasIssues) {
        console.log('\n🔧 Starting automatic dependency installation...');
        
        const success = await this.checker.fixIssues(report.missing, report.outdated);
        
        if (!success) {
          console.log('\n❌ Some dependencies could not be installed automatically.');
          console.log('Please install them manually and run the setup again.');
          return false;
        }
        
        // Re-check after installation
        console.log('\n🔍 Re-checking dependencies after installation...');
        const newResults = await this.checker.checkAll();
        await this.checker.generateReport(newResults);
      }
      
      // Step 3: Install project dependencies
      await this.installProjectDependencies();
      
      // Step 4: Initialize project
      await this.initializeProject();
      
      console.log('\n🎉 Setup completed successfully!');
      console.log('You can now run "npm start" to launch N8NPlus.');
      
      return true;
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      return false;
    }
  }

  async installProjectDependencies() {
    console.log('\n📦 Installing project dependencies...');
    
    // Install root dependencies
    console.log('Installing root dependencies...');
    await this.runNpmInstall('.');
    
    // Install backend dependencies
    console.log('Installing backend dependencies...');
    await this.runNpmInstall('./backend');
    
    // Install frontend dependencies
    console.log('Installing frontend dependencies...');
    await this.runNpmInstall('./frontend');
    
    console.log('✅ All project dependencies installed!');
  }

  async runNpmInstall(directory) {
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['install'], {
        cwd: path.resolve(directory),
        stdio: 'inherit',
        shell: true
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed in ${directory} with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  async initializeProject() {
    console.log('\n⚙️ Initializing project configuration...');
    
    // Create necessary directories and files
    const fs = require('fs');
    const backendDir = path.join(__dirname, '..', 'backend');
    
    // Ensure backend directory exists
    if (!fs.existsSync(backendDir)) {
      fs.mkdirSync(backendDir, { recursive: true });
    }
    
    // Initialize empty containers.json if it doesn't exist
    const containersFile = path.join(backendDir, 'containers.json');
    if (!fs.existsSync(containersFile)) {
      fs.writeFileSync(containersFile, JSON.stringify([], null, 2));
      console.log('✅ Initialized containers.json');
    }
    
    // Initialize config.json if it doesn't exist
    const configFile = path.join(backendDir, 'config.json');
    if (!fs.existsSync(configFile)) {
      const defaultConfig = {
        baseAddress: 'localhost',
        startPort: 5678
      };
      fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Initialized config.json');
    }
    
    console.log('✅ Project initialization completed!');
  }

  async quickCheck() {
    console.log('🔍 Quick dependency check...\n');
    
    const results = await this.checker.checkAll();
    const report = await this.checker.generateReport(results);
    
    if (report.hasIssues) {
      console.log('\n💡 Run "npm run setup" to automatically fix these issues.');
      return false;
    }
    
    return true;
  }
}

// CLI Interface
if (require.main === module) {
  const setupManager = new SetupManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      setupManager.quickCheck();
      break;
    case 'full':
    default:
      setupManager.runFullSetup();
      break;
  }
}

module.exports = SetupManager;
