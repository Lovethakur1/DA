import { Platform } from 'react-native'
import { API_CONFIG } from '@/src/config/api'

export const diagnoseNetworkIssue = async () => {
  console.log('=== Network Diagnostics ===')
  console.log('Platform:', Platform.OS)
  console.log('API Base URL:', API_CONFIG.baseURL)
  console.log('Timeout:', API_CONFIG.timeout)
  
  // Test basic connectivity
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${API_CONFIG.baseURL}/`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    console.log('Basic connectivity test:', response.status)
  } catch (error: any) {
    console.log('Basic connectivity failed:', error.message)
  }
  
  // Provide troubleshooting tips
  console.log('\n=== Troubleshooting Tips ===')
  if (Platform.OS === 'android') {
    console.log('For Android:')
    console.log('1. Make sure your backend server is running on your computer')
    console.log('2. Find your computer\'s IP address:')
    console.log('   - Windows: Run "ipconfig" in Command Prompt')
    console.log('   - Mac/Linux: Run "ifconfig" in Terminal')
    console.log('3. Update the IP in src/config/api.ts')
    console.log('4. Make sure your phone/emulator is on the same WiFi network')
    console.log('5. Check if your firewall is blocking port 8000')
  } else if (Platform.OS === 'ios') {
    console.log('For iOS:')
    console.log('1. Make sure your backend server is running')
    console.log('2. Try using "localhost" or your computer\'s IP address')
    console.log('3. Make sure your simulator/device is on the same network')
  }
  console.log('===============================')
}

export const testBackendConnection = async () => {
  try {
    console.log('Testing backend connection...')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(`${API_CONFIG.baseURL}/api/health/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      console.log('✅ Backend connection successful!')
      return true
    } else {
      console.log('❌ Backend responded with status:', response.status)
      return false
    }
  } catch (error: any) {
    console.log('❌ Backend connection failed:', error.message)
    if (error.name === 'AbortError') {
      console.log('Connection timed out after 10 seconds')
    }
    return false
  }
}

export const testApiEndpoints = async () => {
  console.log('=== Testing API Endpoints ===')
  
  const endpoints = [
    '/api/health/',
    '/api/request-otp/',
    '/api/verify-login/',
    '/api/checkin/',
    '/api/checkout/',
    '/api/break-in/',
    '/api/break-out/',
    '/api/break-history/'
  ]
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: 'OPTIONS', // Use OPTIONS to test endpoint availability
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      console.log(`${endpoint}: ${response.status === 200 || response.status === 405 ? '✅' : '❌'} Status: ${response.status}`)
      
    } catch (error: any) {
      console.log(`${endpoint}: ❌ Error: ${error.message}`)
    }
  }
  
  console.log('==============================')
}
