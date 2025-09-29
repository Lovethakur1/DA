import api, { handleApiError } from './http'

// Helper to convert a file URI into a form-data compatible object for React Native
import { getInfoAsync } from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import { Alert, Platform } from 'react-native'

// Try to compress/resize an image until it's under maxBytes (best-effort).
async function ensureImageUnderSize(uri: string, maxKB = 100): Promise<string> {
  if (!uri) return uri
  const maxBytes = maxKB * 1024
  
  console.log(`Starting image compression with target size: ${maxKB}KB (${maxBytes} bytes)`)

  // Try a series of compress-only passes first
  const qualitySteps = [0.9, 0.8, 0.7, 0.6, 0.5]
  let currentUri = uri

  for (const q of qualitySteps) {
    try {
      const result = await ImageManipulator.manipulateAsync(currentUri, [], { compress: q, format: ImageManipulator.SaveFormat.JPEG })
      currentUri = result.uri
  const info = await getInfoAsync(currentUri)
      const size = (info as any).size ?? 0
      if (info.exists && size <= maxBytes) return currentUri
    } catch {
      // ignore and continue
    }
  }

  // If still too large, attempt iterative resizing + compression
  // Start with a moderate resize factor and reduce further each iteration
  let lastResult = null as any
  let resizeFactor = 0.9
  for (let i = 0; i < 6; i++) {
    try {
      const ops: any[] = []
      if (lastResult && lastResult.width) {
        const newWidth = Math.max(100, Math.round(lastResult.width * resizeFactor))
        ops.push({ resize: { width: newWidth } })
      } else {
        // first resize attempt: reduce to 90% (manipulate will return dimensions)
        ops.push({ resize: { width: 1000 * Math.pow(resizeFactor, i) } })
      }
      const quality = 0.5 // use moderate compression when resizing
      const res = await ImageManipulator.manipulateAsync(currentUri, ops, { compress: quality, format: ImageManipulator.SaveFormat.JPEG })
      lastResult = res
      currentUri = res.uri
  const info = await getInfoAsync(currentUri)
      const size = (info as any).size ?? 0
      if (info.exists && size <= maxBytes) return currentUri
      // reduce more aggressively next iteration
      resizeFactor -= 0.12
      if (resizeFactor < 0.4) resizeFactor = 0.4
    } catch {
      // ignore and continue
    }
  }

  // Return best-effort uri (may still be larger than target)
  return currentUri
}

const makeFileForFormData = (uri: string, name = 'image.jpg', type = 'image/jpeg') => {
  // Ensure proper URI format for React Native FormData
  let fileUri = uri
  
  // Handle different URI formats
  if (Platform.OS === 'android') {
    if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`
    }
  }
  
  console.log('Creating FormData file object:', { uri: fileUri, name, type })
  
  // React Native FormData expects this exact format
  return {
    uri: fileUri,
    name: name,
    type: type
  } as any
}

export const checkIn = async ({ latitude, longitude, photoUri }: { latitude: number; longitude: number; photoUri?: string }) => {
  try {
    console.log('=== CheckIn API Call ===')
    console.log('Parameters:', { latitude, longitude, photoUri: photoUri ? 'provided' : 'none' })
    
    const formData = new FormData()
    // Server expects keys: latitude, longitude, image (matching Postman format)
    formData.append('latitude', String(latitude))
    formData.append('longitude', String(longitude))
    
    console.log('FormData entries so far:', { latitude: String(latitude), longitude: String(longitude) })
    
    if (photoUri) {
      // Compress image to ~100KB before uploading (best-effort)
      try {
        // Debug: log original size
        try {
          const orig = await getInfoAsync(photoUri)
          console.log('checkIn: original image info', { uri: photoUri, exists: orig.exists, size: (orig as any).size ?? null })
        } catch {
          // ignore
        }
        const compressed = await ensureImageUnderSize(photoUri, 100)
        // Debug: log compressed size
        try {
          const after = await getInfoAsync(compressed)
          console.log('checkIn: compressed image info', { uri: compressed, exists: after.exists, size: (after as any).size ?? null })
        } catch {
          // ignore
        }
        
        const fileObject = makeFileForFormData(compressed, 'image.jpg', 'image/jpeg')
        console.log('Appending image to FormData:', fileObject)
        formData.append('image', fileObject)
        
      } catch {
        // fallback to original if compression fails
        try {
          const orig = await getInfoAsync(photoUri)
          console.log('checkIn: compression failed, using original image info', { uri: photoUri, exists: orig.exists, size: (orig as any).size ?? null })
        } catch {
          // ignore
        }
        
        const fileObject = makeFileForFormData(photoUri, 'image.jpg', 'image/jpeg')
        console.log('Appending original image to FormData:', fileObject)
        formData.append('image', fileObject)
      }
    }

    console.log('Making POST request to /api/checkin/ with FormData')
    
    // Do not set the Content-Type header for multipart/form-data here —
    // axios / React Native will set the proper boundary when FormData is used.
    const res = await api.post('/api/checkin/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    console.log('✅ CheckIn successful:', res.data)
    return { success: true, data: res.data }
    
  } catch (error: any) {
    console.error('❌ API check-in error', {
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      message: error?.message,
      config: error?.config
    })
    
    // Handle specific backend error responses
    if (error?.response?.data) {
      const errorData = error.response.data
      
      // Handle "already checked in" error
      if (errorData.non_field_errors && errorData.non_field_errors.includes('You have already checked in today.')) {
        return { success: false, error: 'already_checked_in', message: 'You have already checked in today.' }
      }
      
      // Handle other non_field_errors
      if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        return { success: false, error: 'validation_error', message: errorData.non_field_errors[0] }
      }
      
      // Handle other error formats
      if (errorData.message) {
        return { success: false, error: 'api_error', message: errorData.message }
      }
    }
    
    // For network or other errors, still throw to be handled by the calling function
    throw error
  }
}

export const breakIn = async () => {
  try {
    const res = await api.post('/api/break-in/', {})
    return { success: true, data: res.data }
  } catch (error: any) {
    console.error('❌ API break-in error', error?.response?.data)
    
    // Handle specific backend error responses
    if (error?.response?.data) {
      const errorData = error.response.data
      
      // Handle "need to check in first" error
      if (errorData.message === 'You need to check in first before taking a break.') {
        return { success: false, error: 'not_checked_in', message: errorData.message }
      }
      
      // Handle other error formats
      if (errorData.message) {
        return { success: false, error: 'api_error', message: errorData.message }
      }
    }
    
    // For network or other errors, still throw to be handled by the calling function
    throw error
  }
}

export const breakOut = async () => {
  try {
    const res = await api.put('/api/break-out/', {})
    return { success: true, data: res.data }
  } catch (error: any) {
    console.error('❌ API break-out error', error?.response?.data)
    
    // Handle specific backend error responses
    if (error?.response?.data) {
      const errorData = error.response.data
      
      // Handle "no active break" error
      if (errorData.message === 'No active break found. Please start a break first.') {
        return { success: false, error: 'no_active_break', message: errorData.message }
      }
      
      // Handle other error formats
      if (errorData.message) {
        return { success: false, error: 'api_error', message: errorData.message }
      }
    }
    
    // For network or other errors, still throw to be handled by the calling function
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
    await handleApiError(error, 'Unable to fetch break history')
    throw error
  }
}

export const checkOut = async ({ latitude, longitude, photoUri }: { latitude: number; longitude: number; photoUri?: string }) => {
  try {
    console.log('=== CheckOut API Call ===')
    console.log('Parameters:', { latitude, longitude, photoUri: photoUri ? 'provided' : 'none' })
    
    const formData = new FormData()
    // Server expects keys: latitude, longitude, image (matching Postman format)
    formData.append('latitude', String(latitude))
    formData.append('longitude', String(longitude))
    
    console.log('FormData entries so far:', { latitude: String(latitude), longitude: String(longitude) })
    
    if (photoUri) {
      try {
        // Debug: log original size
        try {
          const orig = await getInfoAsync(photoUri)
          console.log('checkOut: original image info', { uri: photoUri, exists: orig.exists, size: (orig as any).size ?? null })
        } catch {
          // ignore
        }
        const compressed = await ensureImageUnderSize(photoUri, 100)
        // Debug: log compressed size
        try {
          const after = await getInfoAsync(compressed)
          console.log('checkOut: compressed image info', { uri: compressed, exists: after.exists, size: (after as any).size ?? null })
        } catch {
          // ignore
        }
        
        const fileObject = makeFileForFormData(compressed, 'image.jpg', 'image/jpeg')
        console.log('Appending image to FormData:', fileObject)
        formData.append('image', fileObject)
        
      } catch {
        try {
          const orig = await getInfoAsync(photoUri)
          console.log('checkOut: compression failed, using original image info', { uri: photoUri, exists: orig.exists, size: (orig as any).size ?? null })
        } catch {
          // ignore
        }
        
        const fileObject = makeFileForFormData(photoUri, 'image.jpg', 'image/jpeg')
        console.log('Appending original image to FormData:', fileObject)
        formData.append('image', fileObject)
      }
    }

    console.log('Making POST request to /api/checkout/ with FormData')

    // Backend expects POST /api/checkout/
    // Let axios set Content-Type with boundary for FormData
    const res = await api.post('/api/checkout/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    console.log('✅ CheckOut successful:-', res.data)
    return { success: true, data: res.data }
    
  } catch (error: any) {
    console.error('❌ API check-out error', {
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      message: error?.message,
      config: error?.config
    })
    
    // Handle specific backend error responses
    if (error?.response?.data) {
      const errorData = error.response.data
      
      // Handle "already checked out" error
      if (errorData.non_field_errors && errorData.non_field_errors.includes('You have already checked out today.')) {
        return { success: false, error: 'already_checked_out', message: 'You have already checked out today.' }
      }
      
      // Handle "need to check in first" error
      if (errorData.non_field_errors && errorData.non_field_errors.includes('You need to check in first before checking out.')) {
        return { success: false, error: 'not_checked_in', message: 'You need to check in first before checking out.' }
      }
      
      // Handle other non_field_errors
      if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        return { success: false, error: 'validation_error', message: errorData.non_field_errors[0] }
      }
      
      // Handle other error formats
      if (errorData.message) {
        return { success: false, error: 'api_error', message: errorData.message }
      }
    }
    
    // For network or other errors, still throw to be handled by the calling function
    throw error
  }
}

export const getTodayAttendanceStatus = async () => {
  try {
    console.log('=== Today Attendance Status API Call ===')
    
    const res = await api.get('/api/attendance-status/')
    console.log('✅ Today Attendance Status successful:', res.data)
    return res.data
    
  } catch (error: any) {
    console.error('❌ API today attendance status error', {
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      message: error?.message
    })
    await handleApiError(error, 'Unable to fetch today attendance status')
    throw error
  }
}

export const getAttendanceHistory = async (params: { 
  period?: 'weekly' | 'monthly', 
  start_date?: string, 
  end_date?: string 
} = {}) => {
  try {
    console.log('=== Attendance History API Call ===')
    console.log('Parameters:', params)
    
    const query: any = {}
    if (params.period) query.period = params.period
    if (params.start_date) query.start_date = params.start_date
    if (params.end_date) query.end_date = params.end_date
    
    const res = await api.get('/api/attendance-history/', { params: query })
    console.log('✅ Attendance History successful:', res.data)
    return res.data
    
  } catch (error: any) {
    console.error('❌ API attendance history error', {
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      message: error?.message
    })
    await handleApiError(error, 'Unable to fetch attendance history')
    throw error
  }
}
