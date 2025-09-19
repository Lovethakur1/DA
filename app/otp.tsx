import { useAuth } from '@/src/auth/AuthContext'
import KeyboardAwareView from '@/src/components/KeyboardAwareView'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useRef, useState } from 'react'
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

const OTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const router = useRouter()
  const params = useLocalSearchParams()
  const email = (params as any)?.email as string | undefined
  const auth = useAuth()
  const inputRefs = useRef<(TextInput | null)[]>([])
  const [loading, setLoading] = useState(false)

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits')
      return
    }

    if (!email) {
      Alert.alert('Error', 'Missing email parameter')
      return
    }

    setLoading(true)
    try {
  await auth.verifyOtp(email, otpString)
  router.replace('/(tabs)/attendance')
    } catch (error: any) {
      Alert.alert('Verification failed', error?.message || 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = () => {
    Alert.alert('OTP Sent', 'A new OTP has been sent to your registered number')
    setOtp(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  return (
    <KeyboardAwareView>
      <View className="flex-1 bg-white px-6 justify-center">
        {/* Logo Section */}
        <View className="items-center mb-12">
          <Image
            source={require('@/assets/images/logo.png')}
            className="w-200 h-24 mb-5"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold mb-2" style={{ color: '#289294' }}>
            Verify OTP
          </Text>
          <Text className="text-base text-gray-600 text-center leading-6 px-5">
            We&apos;ve sent a 6-digit code to your registered mobile number
          </Text>
        </View>

        {/* OTP Input Section */}
        <View className="mb-10">
          <View className="flex-row justify-between mb-8 px-2">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref
                }}
                className={`w-12 h-15 rounded-xl text-xl font-semibold text-black text-center border-2 ${
                  digit ? 'border-[#289294] bg-[#F0F9F9]' : 'border-gray-200 bg-gray-50'
                }`}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="numeric"
                maxLength={1}
              />
            ))}
          </View>

          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-5 shadow-lg"
            style={{ backgroundColor: '#289294' }}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white text-lg font-semibold">Verify & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={handleResendOtp}>
            <Text className="text-base font-medium" style={{ color: '#289294' }}>
              Didn&apos;t receive code? Resend
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-base font-medium text-gray-600">← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareView>
  )
}

export default OTP
