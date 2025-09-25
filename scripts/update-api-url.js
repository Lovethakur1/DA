const fs = require('fs');
const path = require('path');

// Get the new URL from command line arguments
const newUrl = process.argv[2];

if (!newUrl) {
  console.log('❌ Please provide a new API URL');
  console.log('Usage: node scripts/update-api-url.js <new-url>');
  console.log('Example: node scripts/update-api-url.js http://192.168.1.100:8000');
  process.exit(1);
}

// Validate URL format
try {
  new URL(newUrl);
} catch (error) {
  console.log('❌ Invalid URL format. Please provide a valid URL.');
  console.log('Example: http://192.168.1.100:8000');
  process.exit(1);
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
const envPath = path.join(__dirname, '..', '.env');

try {
  // Update app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.expo.extra.apiBaseUrl = newUrl;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  
  // Update .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/EXPO_PUBLIC_API_BASE_URL=.*/g, `EXPO_PUBLIC_API_BASE_URL=${newUrl}`);
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ API URL updated successfully!');
  console.log(`📡 New API URL: ${newUrl}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Make sure your backend server is running at the new URL');
  console.log('2. Restart your Expo development server: npx expo start');
  console.log('3. Rebuild your app if needed: npx expo run:android');
  
} catch (error) {
  console.log('❌ Error updating API URL:', error.message);
  process.exit(1);
}
