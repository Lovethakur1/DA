import { isOnline, showAlert } from '@/src/utils/network'
import { getItem, removeItem } from '@/src/utils/storage'
import { ENV } from '@/src/config/env'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT
})

// Attach token if available
api.interceptors.request.use(async (config: AxiosRequestConfig | any) => {
  try {
    const token = await getItem('auth.accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('request interceptor error', error)
  }
  return config
})

// Basic response interceptor for 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error?.config
    if (error?.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      // Attempt soft logout: clear tokens and let AuthContext handle navigation
      await removeItem('auth.accessToken')
      await removeItem('auth.refreshToken')
      await removeItem('auth.user')
      await removeItem('auth.createdAt')
    }
    return Promise.reject(error)
  }
)

export default api

// Helper to handle API errors and show user-friendly alerts
export async function handleApiError(error: any, defaultMsg = 'Something went wrong') {
  // Enhanced logging for debugging
  console.error('=== API Error Debug Info ===')
  console.error('Error message:', error?.message)
  console.error('Error code:', error?.code)
  console.error('Request URL:', error?.config?.url)
  console.error('Request method:', error?.config?.method)
  console.error('Base URL:', api.defaults.baseURL)
  console.error('Timeout:', api.defaults.timeout)
  console.error('Full error object:', error)
  console.error('============================')

  // If offline, show network error
  const online = await isOnline()
  if (!online) {
    showAlert('Network error', 'No internet connection. Please check your network and try again.')
    return
  }

  // If we have a response from server, show backend-specific message
  if (error?.response) {
    const status = error.response.status
    const data = error.response.data
    const serverMsg = (data && (data.message || data.error || data.detail)) || defaultMsg

    // Log full response for debugging in dev
    console.error('API error response', {
      status,
      url: error.config?.url,
      method: error.config?.method,
      data,
      headers: error.response.headers
    })

    if (status === 404) {
      showAlert('Not found', "Requested resource wasn't found (404). Please ensure the backend endpoint exists and the base URL is correct.")
    } else if (status >= 500) {
      showAlert('Server error', 'Backend is currently unreachable. Please try again later.')
    } else if (status >= 400) {
      showAlert('Request failed', serverMsg)
    } else {
      showAlert('Error', defaultMsg)
    }
    return
  }

  // Enhanced Network Error handling
  if (error?.message === 'Network Error') {
    console.error('Axios Network Error for baseURL', api.defaults.baseURL, { 
      message: error.message, 
      config: error.config,
      stack: error.stack 
    })
    
    // More specific error messages
    if (error?.code === 'ECONNREFUSED') {
      showAlert('Connection Refused', `Server at ${api.defaults.baseURL} refused the connection. Please check if the server is running.`)
    } else if (error?.code === 'ENOTFOUND') {
      showAlert('Server Not Found', `Cannot find server at ${api.defaults.baseURL}. Please check the URL and your internet connection.`)
    } else if (error?.code === 'ETIMEDOUT') {
      showAlert('Request Timeout', `Request to ${api.defaults.baseURL} timed out after ${api.defaults.timeout}ms. The server might be slow or unreachable.`)
    } else {
      showAlert('Network error', `Unable to reach backend at ${api.defaults.baseURL}. Please check your internet connection and try again.`)
    }
    return
  }

  // Handle timeout errors specifically
  if (error?.code === 'ECONNABORTED' && error?.message?.includes('timeout')) {
    showAlert('Request Timeout', `Request timed out after ${api.defaults.timeout}ms. Please try again or check your internet connection.`)
    return
  }

  showAlert('Error', defaultMsg)
}
