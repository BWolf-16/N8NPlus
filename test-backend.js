// Test script to validate backend changes
const fs = require('fs');
const path = require('path');

try {
  console.log('🔍 Testing backend/index.js changes...');
  
  // Read the backend index.js file
  const backendPath = path.join(__dirname, 'backend', 'index.js');
  const backendContent = fs.readFileSync(backendPath, 'utf8');
  
  // Check for the new stop-all endpoint
  if (backendContent.includes('/api/containers/stop-all')) {
    console.log('✅ Stop-all containers endpoint found');
  } else {
    console.log('❌ Stop-all containers endpoint NOT found');
  }
  
  // Check for the endpoint implementation
  if (backendContent.includes('app.post("/api/containers/stop-all"')) {
    console.log('✅ Stop-all endpoint implementation found');
  } else {
    console.log('❌ Stop-all endpoint implementation NOT found');
  }
  
  // Check for multi-host container stopping logic
  if (backendContent.includes('getContainerFromAnyHost')) {
    console.log('✅ Multi-host container finding logic found');
  }
  
  if (backendContent.includes('stoppedCount')) {
    console.log('✅ Stop-all result tracking found');
  }
  
  console.log('\n🎉 Backend changes validation completed!');
  
} catch (error) {
  console.error('❌ Error during backend validation:', error.message);
  process.exit(1);
}
