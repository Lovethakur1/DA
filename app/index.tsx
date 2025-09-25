import { useAuth } from '@/src/auth/AuthContext'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'

const Index = () => {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      // Check authentication status and redirect accordingly
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          // User is authenticated, redirect to attendance page
          router.replace('/(tabs)/attendance')
        } else {
          // User is not authenticated, redirect to login page
          router.replace('/login')
        }
      }, 1500) // Small delay to show loading screen

      return () => clearTimeout(timer)
    }
  }, [loading, isAuthenticated, router])

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <Image 
        source={require('../assets/images/logo.png')} 
        style={{ width: 120, height: 120, marginBottom: 18 }} 
        resizeMode="contain" 
      />
      <Text className="text-2xl font-bold mb-2" style={{ color: '#289294' }}>
        Welcome to DTR
      </Text>
      <Text className="text-lg mb-6" style={{ color: '#289294' }}>
        {loading ? 'Checking authentication...' : 'Redirecting...'}
      </Text>
      <ActivityIndicator size="large" color="#289294" />
    </View>
  )
}

export default Index