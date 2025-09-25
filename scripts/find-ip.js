const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  console.log('=== Finding Your Computer\'s IP Address ===\n');
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`Network Interface: ${name}`);
        console.log(`IP Address: ${interface.address}`);
        console.log(`Use this IP in your React Native app: http://${interface.address}:8000\n`);
      }
    }
  }
  
  console.log('Instructions:');
  console.log('1. Copy one of the IP addresses above');
  console.log('2. Open src/config/api.ts in your React Native project');
  console.log('3. Replace the DEVELOPMENT_IP with your IP address');
  console.log('4. Make sure your backend server is running on port 8000');
  console.log('5. Rebuild your React Native app');
  console.log('\nNote: Make sure your phone/emulator is on the same WiFi network!');
}

getLocalIPAddress();
