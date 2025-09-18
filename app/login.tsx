import { useAuth } from '@/src/auth/AuthContext'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

const Login = () => {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const auth = useAuth()

  const handleSubmit = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    try {
      await auth.loginWithOtp(userId, password)
      // push to otp screen and pass email param
      router.push({ pathname: '/otp', params: { email: userId } })
    } catch (error: any) {
      Alert.alert('Login Error', error?.message || 'Failed to request OTP')
    }
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 justify-center">
        {/* Logo Section */}
        <View className="items-center mb-12">
          <Image 
            source={require('@/assets/images/logo.png')}
            className="w-200 h-24 mb-5"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold mb-2" style={{ color: '#289294' }}>
            Welcome Back
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Sign in to your account
          </Text>
        </View>

        {/* Form Section */}
        <View className="mb-10">
          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-2">User ID</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base bg-gray-50 text-black"
              placeholder="Enter your user ID"
              placeholderTextColor="#999"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
            />
          </View>

          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-2">Password</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base bg-gray-50 text-black"
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            className="rounded-xl py-4 items-center mt-5 shadow-lg"
            style={{ backgroundColor: '#289294' }}
            onPress={handleSubmit}
          >
            <Text className="text-white text-lg font-semibold">Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center">
          <Text className="text-sm text-gray-600 text-center">
            Don't have an account? Contact support
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
} 


export default Login