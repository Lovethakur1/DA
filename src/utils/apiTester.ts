import { checkIn, checkOut } from '@/src/api/attendance'

/**
 * Test function to verify API responses and help debug response format issues
 * Call this from your app to see exactly what the backend returns
 */
export const testApiResponses = async () => {
  console.log('=== API Response Testing ===')
  
  // Test coordinates (you can change these)
  const testCoords = {
    latitude: 28.62979,
    longitude: 77.38094
  }
  
  try {
    console.log('Testing CheckIn API...')
    const checkinResponse = await checkIn({
      latitude: testCoords.latitude,
      longitude: testCoords.longitude,
      // photoUri: undefined // Test without photo first
    })
    
    console.log('✅ CheckIn Response Structure:')
    console.log('Type:', typeof checkinResponse)
    console.log('Keys:', Object.keys(checkinResponse || {}))
    console.log('Full Response:', JSON.stringify(checkinResponse, null, 2))
    console.log('Has success?', 'success' in (checkinResponse || {}))
    console.log('Has status?', 'status' in (checkinResponse || {}))
    console.log('Has message?', 'message' in (checkinResponse || {}))
    console.log('Has checkin_time?', 'checkin_time' in (checkinResponse || {}))
    
  } catch (error) {
    console.error('❌ CheckIn test failed:', error)
  }
  
  try {
    console.log('\nTesting CheckOut API...')
    const checkoutResponse = await checkOut({
      latitude: testCoords.latitude,
      longitude: testCoords.longitude,
      // photoUri: undefined // Test without photo first
    })
    
    console.log('✅ CheckOut Response Structure:')
    console.log('Type:', typeof checkoutResponse)
    console.log('Keys:', Object.keys(checkoutResponse || {}))
    console.log('Full Response:', JSON.stringify(checkoutResponse, null, 2))
    console.log('Has success?', 'success' in (checkoutResponse || {}))
    console.log('Has status?', 'status' in (checkoutResponse || {}))
    console.log('Has message?', 'message' in (checkoutResponse || {}))
    console.log('Has checkout_time?', 'checkout_time' in (checkoutResponse || {}))
    
  } catch (error) {
    console.error('❌ CheckOut test failed:', error)
  }
  
  console.log('=== End API Testing ===')
}

/**
 * Quick validation function to check if a response should be considered successful
 */
export const validateApiResponse = (data: any, operation: 'checkin' | 'checkout') => {
  console.log(`Validating ${operation} response:`, data)
  
  if (!data) {
    console.log('❌ No data received')
    return false
  }
  
  const checks = {
    hasSuccess: data.success === true,
    hasStatus: data.status === 'success',
    hasTime: operation === 'checkin' ? !!data.checkin_time : !!data.checkout_time,
    hasCoords: operation === 'checkin' ? !!data.checkin_latitude : !!data.checkout_latitude,
    hasMessage: !!data.message || !!data.msg || !!data.detail,
    isObject: typeof data === 'object' && Object.keys(data).length > 0
  }
  
  console.log('Validation checks:', checks)
  
  const isValid = Object.values(checks).some(check => check === true)
  console.log(`${isValid ? '✅' : '❌'} Response is ${isValid ? 'valid' : 'invalid'}`)
  
  return isValid
}
