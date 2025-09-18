import AsyncStorage from '@react-native-async-storage/async-storage'

const cache = new Map<string, string | null>()

export const setItem = async (key: string, value: string) => {
  try {
    cache.set(key, value)
    await AsyncStorage.setItem(key, value)
  } catch (error) {
    console.error('storage.setItem error', error)
    throw error
  }
}

export const getItem = async (key: string) => {
  try {
    if (cache.has(key)) return cache.get(key)
    const value = await AsyncStorage.getItem(key)
    cache.set(key, value)
    return value
  } catch (error) {
    console.error('storage.getItem error', error)
    return null
  }
}

export const removeItem = async (key: string) => {
  try {
    cache.delete(key)
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error('storage.removeItem error', error)
    throw error
  }
}

export const clearAll = async () => {
  try {
    cache.clear()
    await AsyncStorage.clear()
  } catch (error) {
    console.error('storage.clearAll error', error)
    throw error
  }
}
