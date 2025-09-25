// Simple environment variable loader for React Native
// This reads from process.env which Expo/Metro can populate

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dtr.promanageitsolution.com',
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
}

// Log the environment variables for debugging
console.log('Environment Variables Loaded:', {
  API_BASE_URL: ENV.API_BASE_URL,
  API_TIMEOUT: ENV.API_TIMEOUT,
})

export default ENV
