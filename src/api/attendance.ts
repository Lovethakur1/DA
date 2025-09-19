import api from './http'

// Helper to convert a file URI into a form-data compatible object for React Native
import { Platform } from 'react-native'

const makeFileForFormData = (uri: string, name = 'photo.jpg', type = 'image/jpeg') => {
  // Ensure Android gets a file:// URI if necessary
  let fileUri = uri
  if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
    fileUri = `file://${fileUri}`
  }
  // In React Native, FormData accepts an object with uri, name and type
  return {
    uri: fileUri,
    name,
    type
  }
}

export const checkIn = async ({ latitude, longitude, photoUri }: { latitude: number; longitude: number; photoUri?: string }) => {
  const formData = new FormData()
  // Server expects keys: latitude, longitude, image
  formData.append('latitude', String(latitude))
  formData.append('longitude', String(longitude))
  if (photoUri) {
    // Cast to any to satisfy React Native FormData typing in TypeScript
    formData.append('image', makeFileForFormData(photoUri) as any)
  }

  const res = await api.post('/api/checkin/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}

export const breakIn = async () => {
  try {
    const res = await api.post('/api/break-in/', {})
    return res.data
  } catch (error: any) {
    if (error?.response?.data) throw error.response.data
    throw error
  }
}

export const breakOut = async () => {
  try {
    const res = await api.put('/api/break-out/', {})
    return res.data
  } catch (error: any) {
    if (error?.response?.data) throw error.response.data
    throw error
  }
}

export const breakHistory = async (params: { limit?: number; date?: string } = {}) => {
  try {
    const query: any = {}
    if (params.limit) query.limit = params.limit
    if (params.date) query.date = params.date
    const res = await api.get('/api/break-history/', { params: query })
    return res.data
  } catch (error: any) {
    if (error?.response?.data) throw error.response.data
    throw error
  }
}

export const checkOut = async ({ latitude, longitude, photoUri }: { latitude: number; longitude: number; photoUri?: string }) => {
  const formData = new FormData()
  // Server expects keys: latitude, longitude, image
  formData.append('latitude', String(latitude))
  formData.append('longitude', String(longitude))
  if (photoUri) {
    // Cast to any to satisfy React Native FormData typing in TypeScript
    formData.append('image', makeFileForFormData(photoUri) as any)
  }

  // Backend expects POST /api/checkout/
  const res = await api.post('/api/checkout/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}
