import { useAuth } from '@/src/auth/AuthContext'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.replace('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return fallback || (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#289294" />
        <Text className="text-lg mt-4" style={{ color: '#289294' }}>
          Verifying authentication...
        </Text>
      </View>
    )
  }

  if (!isAuthenticated) {
    return fallback || (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg" style={{ color: '#289294' }}>
          Redirecting to login...
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
