import { AuthProvider } from '@/src/auth/AuthContext'
import AppNavigator from '@/src/navigation/AppNavigator'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <AppNavigator />
      </SafeAreaView>
    </AuthProvider>
  )
}
