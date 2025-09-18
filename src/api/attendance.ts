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
  formData.append('checkin_latitude', String(latitude))
  formData.append('checkin_longitude', String(longitude))
  if (photoUri) {
    // Cast to any to satisfy React Native FormData typing in TypeScript
    formData.append('checkin_photo', makeFileForFormData(photoUri) as any)
  }

  const res = await api.post('/api/checkin/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}

export const checkOut = async ({ latitude, longitude, photoUri }: { latitude: number; longitude: number; photoUri?: string }) => {
  const formData = new FormData()
  formData.append('checkout_latitude', String(latitude))
  formData.append('checkout_longitude', String(longitude))
  if (photoUri) {
    // Cast to any to satisfy React Native FormData typing in TypeScript
    formData.append('checkout_photo', makeFileForFormData(photoUri) as any)
  }

  // Backend expects POST /api/checkout/ (updated API)
  const res = await api.post('/api/checkout/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}
