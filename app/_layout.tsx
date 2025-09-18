import { AuthProvider } from '@/src/auth/AuthContext';
import { Stack } from "expo-router";
import React from 'react';
import "./global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}