// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://api.example.com',
  API_KEY: process.env.EXPO_PUBLIC_API_KEY,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_API_KEY}`
  }
}

// Example API function
export const fetchData = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/data`, {
      method: 'GET',
      headers: API_CONFIG.headers
    })

    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}