import { AuthProvider } from '@/src/auth/AuthContext'
import AppNavigator from '@/src/navigation/AppNavigator'
import React, { useEffect } from 'react'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import { Alert } from 'react-native'

// Setup global JS error handlers to surface a user-friendly alert instead of
// allowing uncaught JS errors to trigger a reload in dev or crash in production.
function useGlobalErrorHandlers() {
  useEffect(() => {
    try {
      const globalObj: any = global || globalThis

      // ErrorUtils for React Native
      const ErrorUtils: any = (globalObj as any).ErrorUtils
      if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
        const previousHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler()
        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          console.error('Global JS error', error, { isFatal })
          try {
            Alert.alert('Unexpected error', (error && error.message) ? String(error.message) : 'An unexpected error occurred. Please try again.', [
              { text: 'OK' }
            ])
          } catch {
            // ignore
          }
          if (previousHandler) {
            try { previousHandler(error, isFatal) } catch { }
          }
        })
      }

      // Handle unhandled promise rejections (Node-style)
      if (globalObj.process && typeof globalObj.process.on === 'function') {
        try {
          globalObj.process.on('unhandledRejection', (reason: any) => {
            console.error('Unhandled promise rejection', reason)
            try {
              Alert.alert('Unexpected error', (reason && reason.message) ? String(reason.message) : 'An unexpected error occurred. Please try again.', [
                { text: 'OK' }
              ])
            } catch {}
          })
        } catch {}
      }
    } catch (e) {
      // fail silently if handlers cannot be attached
      console.warn('Could not set global error handlers', e)
    }
  }, [])
}

export default function App() {
  useGlobalErrorHandlers()
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <AppNavigator />
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  )
}
