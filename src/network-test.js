#!/usr/bin/env node

/**
 * Network testing and debugging script for N8NPlus
 * Run with: node src/network-test.js [command]
 * 
 * Commands:
 *   scan - Scan local networks for N8NPlus instances
 *   info - Show network interface information
 *   test <host> <port> - Test connection to specific host:port
 *   check <host> <port> - Check if host is running N8NPlus
 */

const NetworkUtils = require('./network-utils');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log('🌐 N8NPlus Network Testing Tool\n');
  
  switch (command) {
    case 'scan':
      await scanNetworks();
      break;
      
    case 'info':
      showNetworkInfo();
      break;
      
    case 'test':
      if (args.length < 3) {
        console.log('Usage: node src/network-test.js test <host> <port>');
        process.exit(1);
      }
      await testConnection(args[1], parseInt(args[2]));
      break;
      
    case 'check':
      if (args.length < 3) {
        console.log('Usage: node src/network-test.js check <host> <port>');
        process.exit(1);
      }
      await checkN8NPlus(args[1], parseInt(args[2]));
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

async function scanNetworks() {
  console.log('🔍 Scanning local networks for N8NPlus instances...\n');
  
  const startTime = Date.now();
  const devices = await NetworkUtils.scanAllNetworks([3000, 8080, 8000]);
  const endTime = Date.now();
  
  console.log(`\n⏱️  Scan completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);
  
  if (devices.length === 0) {
    console.log('❌ No N8NPlus instances found on the network.');
    console.log('\nTips:');
    console.log('- Make sure N8NPlus is running on remote devices');
    console.log('- Check that port 3000 is accessible (firewall settings)');
    console.log('- Verify devices are on the same network');
  } else {
    console.log(`🎯 Found ${devices.length} N8NPlus instance(s):\n`);
    
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.displayName}`);
      console.log(`   Type: ${device.type}`);
      console.log(`   Service: ${device.service}`);
      if (device.version) {
        console.log(`   Version: ${device.version}`);
      }
      console.log(`   Found at: ${device.timestamp}`);
      console.log('');
    });
  }
}

function showNetworkInfo() {
  console.log('📡 Network Interface Information:\n');
  
  const info = NetworkUtils.getSystemInfo();
  
  console.log(`Hostname: ${info.hostname}`);
  console.log(`Platform: ${info.platform} (${info.arch})`);
  console.log(`Uptime: ${Math.floor(info.uptime / 3600)}h ${Math.floor((info.uptime % 3600) / 60)}m\n`);
  
  console.log('Network Interfaces:');
  info.interfaces.forEach((iface, index) => {
    console.log(`${index + 1}. ${iface.interface}: ${iface.address}`);
    console.log(`   Network: ${iface.network}.0/24`);
    console.log(`   Netmask: ${iface.netmask}\n`);
  });
  
  console.log('Networks to scan:');
  info.networks.forEach((network, index) => {
    console.log(`${index + 1}. ${network}.0/24 (${network}.1-${network}.254)`);
  });
}

async function testConnection(host, port) {
  console.log(`🔗 Testing connection to ${host}:${port}...\n`);
  
  const startTime = Date.now();
  const isOpen = await NetworkUtils.checkPort(host, port, 5000);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  if (isOpen) {
    console.log(`✅ Connection successful to ${host}:${port}`);
    console.log(`⏱️  Response time: ${responseTime}ms`);
  } else {
    console.log(`❌ Connection failed to ${host}:${port}`);
    console.log(`⏱️  Timeout after: ${responseTime}ms`);
    console.log('\nPossible issues:');
    console.log('- Host is not running');
    console.log('- Port is not open');
    console.log('- Firewall blocking connection');
    console.log('- Network connectivity issues');
  }
}

async function checkN8NPlus(host, port) {
  console.log(`🔍 Checking if ${host}:${port} is running N8NPlus...\n`);
  
  const result = await NetworkUtils.checkN8NPlus(host, port);
  
  if (result) {
    console.log(`✅ N8NPlus detected at ${host}:${port}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Service: ${result.service}`);
    if (result.version) {
      console.log(`   Version: ${result.version}`);
    }
    if (result.frontendPort) {
      console.log(`   Frontend Port: ${result.frontendPort}`);
    }
  } else {
    console.log(`❌ N8NPlus not detected at ${host}:${port}`);
    console.log('\nThis could mean:');
    console.log('- Host is not running N8NPlus');
    console.log('- N8NPlus is running on a different port');
    console.log('- Host is not responding');
  }
}

function showHelp() {
  console.log('Available commands:');
  console.log('');
  console.log('  scan                     - Scan local networks for N8NPlus instances');
  console.log('  info                     - Show network interface information');
  console.log('  test <host> <port>       - Test connection to specific host:port');
  console.log('  check <host> <port>      - Check if host is running N8NPlus');
  console.log('  help                     - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node src/network-test.js scan');
  console.log('  node src/network-test.js info');
  console.log('  node src/network-test.js test 192.168.1.100 3000');
  console.log('  node src/network-test.js check 192.168.1.100 3000');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { main };
