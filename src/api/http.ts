import { getItem, removeItem } from '@/src/utils/storage'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

const api = axios.create({
  baseURL: 'http://192.168.0.121:8000',
  timeout: 10000
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
