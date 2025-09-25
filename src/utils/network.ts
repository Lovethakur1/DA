import { Alert } from 'react-native'

// Check connectivity by requesting a lightweight URL that returns 204 when online.
export async function isOnline(timeout = 3000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(id)
    return res.status === 204 || res.ok
  } catch {
    return false
  }
}

export function showAlert(title: string, message: string) {
  Alert.alert(title, message)
}
