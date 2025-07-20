const os = require('os');
const net = require('net');
const http = require('http');

/**
 * Network utilities for N8NPlus
 * Handles network discovery, host scanning, and connection management
 */
class NetworkUtils {
  
  /**
   * Get all network interfaces and their IPv4 addresses
   * @returns {Array} Array of network interface info
   */
  static getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const interfaceName in interfaces) {
      const networkInterface = interfaces[interfaceName];
      for (const alias of networkInterface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          addresses.push({
            interface: interfaceName,
            address: alias.address,
            netmask: alias.netmask,
            network: alias.address.substring(0, alias.address.lastIndexOf('.'))
          });
        }
      }
    }
    
    return addresses;
  }
  
  /**
   * Get local networks for scanning
   * @returns {Array} Array of network prefixes (e.g., ['192.168.1', '10.0.0'])
   */
  static getLocalNetworks() {
    const interfaces = this.getNetworkInterfaces();
    const networks = [...new Set(interfaces.map(iface => iface.network))];
    return networks;
  }
  
  /**
   * Check if a port is open on a specific host
   * @param {string} host - Hostname or IP address
   * @param {number} port - Port number
   * @param {number} timeout - Timeout in milliseconds (default: 1000)
   * @returns {Promise<boolean>} True if port is open
   */
  static checkPort(host, port, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }
  
  /**
   * Check if a host is running N8NPlus by making HTTP request
   * @param {string} host - Hostname or IP address
   * @param {number} port - Port number
   * @returns {Promise<object|null>} N8NPlus info or null
   */
  static async checkN8NPlus(host, port) {
    try {
      // First check if port is open
      const portOpen = await this.checkPort(host, port, 2000);
      if (!portOpen) return null;
      
      // Try to get N8NPlus info from the frontend
      const frontendInfo = await this.httpRequest(host, port, '/', 2000);
      if (frontendInfo && (frontendInfo.includes('N8NPlus') || frontendInfo.includes('n8n Container Manager'))) {
        return {
          type: 'frontend',
          host,
          port,
          service: 'N8NPlus Frontend'
        };
      }
      
      // Try to get info from the backend API
      const backendPort = 9999;
      const backendOpen = await this.checkPort(host, backendPort, 2000);
      if (backendOpen) {
        try {
          const healthData = await this.httpRequest(host, backendPort, '/api/health', 2000);
          if (healthData) {
            const health = JSON.parse(healthData);
            if (health.service === 'N8NPlus') {
              return {
                type: 'backend',
                host,
                port: backendPort,
                service: 'N8NPlus Backend',
                version: health.version,
                frontendPort: port
              };
            }
          }
        } catch (err) {
          // Backend API not available, but frontend might be N8NPlus
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Make HTTP request with timeout
   * @param {string} host - Hostname or IP address
   * @param {number} port - Port number
   * @param {string} path - Request path
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} Response data
   */
  static httpRequest(host, port, path, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        port: port,
        path: path,
        method: 'GET',
        timeout: timeout,
        headers: {
          'User-Agent': 'N8NPlus-NetworkScanner/1.0'
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }
  
  /**
   * Scan a network range for N8NPlus instances
   * @param {string} networkPrefix - Network prefix (e.g., '192.168.1')
   * @param {Array} ports - Ports to scan (default: [3000])
   * @param {number} concurrency - Max concurrent scans (default: 50)
   * @returns {Promise<Array>} Array of found N8NPlus instances
   */
  static async scanNetwork(networkPrefix, ports = [3000], concurrency = 50) {
    console.log(`🔍 Scanning network ${networkPrefix}.0/24 for N8NPlus instances...`);
    
    const foundDevices = [];
    const scanPromises = [];
    
    // Create scan promises for all IPs in the range
    for (let i = 1; i <= 254; i++) {
      const ip = `${networkPrefix}.${i}`;
      for (const port of ports) {
        scanPromises.push(this.scanSingleHost(ip, port));
      }
    }
    
    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < scanPromises.length; i += concurrency) {
      const batch = scanPromises.slice(i, i + concurrency);
      const results = await Promise.allSettled(batch);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          foundDevices.push(result.value);
        }
      });
      
      // Small delay between batches to be nice to the network
      if (i + concurrency < scanPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return foundDevices;
  }
  
  /**
   * Scan a single host for N8NPlus
   * @param {string} ip - IP address
   * @param {number} port - Port number
   * @returns {Promise<object|null>} N8NPlus info or null
   */
  static async scanSingleHost(ip, port) {
    try {
      const result = await this.checkN8NPlus(ip, port);
      if (result) {
        console.log(`🎯 Found N8NPlus at ${ip}:${port}`);
        return {
          ...result,
          displayName: `${ip}:${port}`,
          timestamp: new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Scan all local networks for N8NPlus instances
   * @param {Array} ports - Ports to scan (default: [3000])
   * @returns {Promise<Array>} Array of found N8NPlus instances
   */
  static async scanAllNetworks(ports = [3000]) {
    const networks = this.getLocalNetworks();
    console.log(`🔍 Scanning ${networks.length} local networks:`, networks);
    
    const allDevices = [];
    
    // Scan networks in parallel (but limit to first 3 to avoid overwhelming)
    const networkPromises = networks.slice(0, 3).map(network => 
      this.scanNetwork(network, ports)
    );
    
    const results = await Promise.allSettled(networkPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allDevices.push(...result.value);
      }
    });
    
    // Remove duplicates based on host:port
    const uniqueDevices = allDevices.filter((device, index, self) => 
      index === self.findIndex(d => d.displayName === device.displayName)
    );
    
    console.log(`🎯 Network scan complete. Found ${uniqueDevices.length} N8NPlus instances.`);
    return uniqueDevices;
  }
  
  /**
   * Get system network information
   * @returns {object} System network info
   */
  static getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      interfaces: this.getNetworkInterfaces(),
      networks: this.getLocalNetworks(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = NetworkUtils;
