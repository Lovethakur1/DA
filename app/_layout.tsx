import { AuthProvider } from '@/src/auth/AuthContext';
// import { NavigationContainer } from '@react-navigation/native';
import { Stack } from "expo-router";
import React from 'react';
import { View } from 'react-native';
import "./global.css";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* <NavigationContainer> */}
        <SafeAreaView style={{ flex: 1 }}>
          <Stack>
          <Stack.Screen 
            name="index" 
            options={{
              headerShown: false,
              title: "Welcome"
            }}
          />
          <Stack.Screen 
            name="login" 
            options={{
              headerShown: false,
              title: "Login"
            }}
          />
          <Stack.Screen 
            name="otp" 
            options={{
              headerShown: false,
              title: "OTP Verification"
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="onboarding" 
            options={{headerShown: false}}
          />
          </Stack>
        </SafeAreaView>
      {/* </NavigationContainer> */}
    </AuthProvider>
  );
}