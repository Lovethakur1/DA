import { ENV } from './env'

// API Configuration from environment variables
export const API_CONFIG = {
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
}

console.log('API Configuration:', {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  source: 'environment variables (.env file)'
})

export default API_CONFIG
