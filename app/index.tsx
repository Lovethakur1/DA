import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { Text, View } from 'react-native'

const Index = () => {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect to login page when app starts
    const timer = setTimeout(() => {
      router.replace('/login')
    }, 1000) // Small delay to show loading

    return () => clearTimeout(timer)
  }, [])

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <Text className="text-2xl font-bold mb-4" style={{ color: '#289294' }}>
        Welcome
      </Text>
      <Text className="text-lg" style={{ color: '#289294' }}>
        Loading...
      </Text>
    </View>
  )
}

export default Index