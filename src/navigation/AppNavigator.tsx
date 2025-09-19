import { useAuth } from '@/src/auth/AuthContext'
import LoginScreen from '@/src/screens/LoginScreen'
import OtpScreen from '@/src/screens/OtpScreen'
import ProfileScreen from '@/src/screens/ProfileScreen'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'

const Stack = createNativeStackNavigator()

const AppNavigator = () => {
  const auth = useAuth()

  // while we hydrate session, show a spinner to avoid flashing auth screens
  if (auth.loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#289294" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!auth.isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default AppNavigator
