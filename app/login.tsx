import { useAuth } from '@/src/auth/AuthContext'
import KeyboardAwareView from '@/src/components/KeyboardAwareView'
import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

const BRAND = '#289294'

const Login = () => {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const auth = useAuth()

  const canSubmit = useMemo(
    () => userId.trim().length > 0 && password.trim().length > 0 && !isSubmitting,
    [userId, password, isSubmitting]
  )

  const handleSubmit = async () => {
    if (!userId.trim() || !password.trim()) {
      alert('Please fill in all fields')
      return
    }

    try {
      setIsSubmitting(true)
      await auth.loginWithOtp(userId.trim(), password)
      router.push({ pathname: '/otp', params: { email: userId.trim() } })
    } catch (error: any) {
      alert(error?.message || 'Failed to request OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAwareView>
      {/* Background */}
      <View className="flex-1 bg-white">
        {/* Decorative header wave / strip */}
        <View
          style={{ backgroundColor: BRAND }}
          className="h-40 rounded-b-[32] shadow-md"
        />

        {/* Content */}
        <View className="flex-1 -mt-20 px-6">
          {/* Card */}
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            {/* Logo + Heading */}
            <View className="items-center mb-6">
              <Image
                source={require('@/assets/images/logo.png')}
                className="w-48 h-14 mb-4"
                resizeMode="contain"
                accessibilityLabel="Company logo"
              />
              <Text className="text-2xl font-bold" style={{ color: BRAND }}>
                Welcome Back
              </Text>
              <Text className="text-gray-600 mt-1">Sign in to your account</Text>
            </View>

            {/* Form */}
            <View>
              {/* User ID */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  User ID
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
                  <TextInput
                    className="flex-1 py-3.5 text-base text-black"
                    placeholder="Enter your user ID"
                    placeholderTextColor="#9CA3AF"
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    accessibilityLabel="User ID"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-2">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Password
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
                  <TextInput
                    className="flex-1 py-3.5 text-base text-black"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    accessibilityLabel="Password"
                  />
                  <Pressable
                    hitSlop={10}
                    onPress={() => setShowPassword((s) => !s)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text className="text-sm font-semibold" style={{ color: BRAND }}>
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Minor actions row */}
              <View className="flex-row justify-between items-center mb-2">
                <View className="opacity-0">
                  {/* Placeholder to keep layout balanced (add Remember Me here if needed) */}
                  <Text className="text-xs"> </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/forgot-password')}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-medium" style={{ color: BRAND }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                className={`rounded-xl py-4 items-center mt-4 shadow-lg ${!canSubmit ? 'opacity-60' : ''}`}
                style={{ backgroundColor: BRAND }}
                onPress={handleSubmit}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-semibold">Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-3 text-gray-400 text-xs">Need Access?</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {/* Footer */}
            <View className="items-center">
              <Text className="text-sm text-gray-600 text-center">
                Don&apos;t have an account?{' '}
                <Text className="font-semibold" style={{ color: BRAND }}>
                  Contact Support
                </Text>
              </Text>
            </View>
          </View>

          {/* Subtle helper text */}
          <View className="items-center mt-4">
            <Text className="text-[11px] text-gray-400">
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAwareView>
  )
}

export default Login
